import { readFile } from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";
import {
  activateEmailListMember,
  addNewMemberToEmailList,
  isAlreadySubscribed as isOnMailgunList,
  sendEmail as sendMailgunEmail,
} from "src/lib/mailgun";
import { confirmLink, getLegacyHash, legacyConfirmLink } from "./confirmLink";
import {
  confirmSubscription,
  findSubscriber,
  isConfirmedOnList,
  sendTransactional,
} from "./listmonk";
import { DEFAULT_LIST, type ListKey, listIdFor, listNames, NEWSLETTER_LISTS } from "./lists";

/**
 * Double opt-in for the site's mailing lists (see `./lists`). One signup can
 * join several lists; one confirm click confirms all of them.
 *
 * ListMonk, sending through SES, is the backend. `NEWSLETTER_PROVIDER=mailgun`
 * pins a deployment to Mailgun until the cutover: Vercel Production keeps
 * it until SES has production access and the subscribers are imported, and
 * removing it is the cutover. The Mailgun branches go once Mailgun is
 * decommissioned. Confirm links of both formats work under either provider.
 * Mailgun only has the Live and Learn list.
 */
export type NewsletterProvider = "listmonk" | "mailgun";

export function newsletterProvider(): NewsletterProvider {
  const raw = process.env.NEWSLETTER_PROVIDER?.trim().toLowerCase();
  if (!raw || raw === "listmonk") return "listmonk";
  if (raw === "mailgun") return "mailgun";
  throw new Error(`Unknown NEWSLETTER_PROVIDER: ${raw}`);
}

// The HTML5 form check. The confirm click is the real proof of ownership,
// this only keeps obvious garbage from turning into a bounce.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > 254) return null;
  if (!EMAIL_RE.test(trimmed)) return null;
  return trimmed;
}

/**
 * `true` when the address is already a confirmed member of the `list`, so
 * the form can say so instead of sending another confirmation email. A
 * lookup error counts as "no" so a hiccup falls through to the normal path.
 */
export async function isAlreadySubscribed(
  email: string,
  list: ListKey = DEFAULT_LIST,
): Promise<boolean> {
  try {
    if (newsletterProvider() === "mailgun") {
      return list === DEFAULT_LIST && (await isOnMailgunList(email));
    }
    const listId = listIdFor(list);
    return listId !== null && (await isConfirmedOnList(email, listId));
  } catch {
    return false;
  }
}

/** The lists in `lists` the address has not confirmed yet, in the same order. */
export async function listsToConfirm(email: string, lists: readonly ListKey[]): Promise<ListKey[]> {
  const already = await Promise.all(lists.map((list) => isAlreadySubscribed(email, list)));
  return lists.filter((_, i) => !already[i]);
}

function confirmCopy(lists: readonly ListKey[]) {
  if (lists.length === 1 && lists[0] === DEFAULT_LIST) {
    return {
      subject: "Confirm Signup to the Live and Learn Newsletter",
      heading: "Welcome to Live and Learn.",
      intro:
        "Well almost... You still need to click the button below. Only then, you will get my newsletter regularly. Double Opt-In is a thing these days, you know. 😉",
    };
  }
  const names = listNames(lists);
  return {
    subject: `Confirm your signup to ${names}`,
    heading: `Welcome to ${names}.`,
    intro: `Well almost... You still need to click the button below. Only then, you will get ${lists
      .map((list) => {
        const promise = NEWSLETTER_LISTS[list].promise.replace(/\.$/, "");
        return promise[0].toLowerCase() + promise.slice(1);
      })
      .join(", and ")}. 😉`,
  };
}

async function renderConfirmEmail(link: string, lists: readonly ListKey[]) {
  const source = await readFile(
    path.join(process.cwd(), "src", "content", "email-templates", "confirmSubscription.hbs"),
    "utf-8",
  );
  const { subject, heading, intro } = confirmCopy(lists);
  return {
    subject,
    html: Handlebars.compile(source)({ confirmLink: link, heading, intro }),
    text: `You signed up for ${listNames(lists)}. You can confirm your subscription by clicking this link ${link}`,
  };
}

/**
 * Mail the confirm link. A blocklisted address (a hard bounce, a spam
 * complaint, or a reader who blocklisted themselves on the unsubscribe
 * page) gets nothing, and the form answers as usual so it does not tell
 * a stranger which addresses are blocklisted.
 */
export async function sendConfirmationEmail(
  email: string,
  lists: readonly ListKey[] = [DEFAULT_LIST],
): Promise<void> {
  if (newsletterProvider() === "listmonk") {
    if ((await findSubscriber(email))?.status === "blocklisted") {
      console.info(
        JSON.stringify({ scope: "newsletter.signup", event: "skipped", reason: "blocklisted" }),
      );
      return;
    }
    const { subject, html } = await renderConfirmEmail(confirmLink(email, lists), lists);
    await sendTransactional({ to: email, subject, html });
    return;
  }

  // The hash link only knows Live and Learn; `availableListKeys` keeps the
  // other lists away from a Mailgun-pinned signup.
  if (lists.some((list) => list !== DEFAULT_LIST)) {
    throw new Error(`Mailgun only has the ${DEFAULT_LIST} list, got ${lists.join(", ")}`);
  }
  await addNewMemberToEmailList({ email, name: "", vars: { hash: await getLegacyHash(email) } });
  const { subject, html, text } = await renderConfirmEmail(await legacyConfirmLink(email), [
    DEFAULT_LIST,
  ]);
  await sendMailgunEmail({
    from: "Rico Trebeljahr <rico@trebeljahr.com>",
    to: email,
    subject,
    html,
    text,
  });
}

/**
 * Only call this once a confirm link has proven the reader owns `email`.
 * A list that is no longer configured (its env var was removed after the
 * link went out) is skipped and logged; the others still confirm.
 */
export async function confirmAddress(
  email: string,
  lists: readonly ListKey[] = [DEFAULT_LIST],
): Promise<void> {
  const skip = (list: ListKey) =>
    console.warn(JSON.stringify({ scope: "newsletter.confirm", event: "skipped", list }));

  if (newsletterProvider() === "mailgun") {
    for (const list of lists) {
      if (list === DEFAULT_LIST) await activateEmailListMember(email);
      else skip(list);
    }
    return;
  }

  for (const list of lists) {
    const listId = listIdFor(list);
    if (listId === null) {
      // Live and Learn without a list id is a broken deployment, not a
      // retired list: fail so the reader sees the error page.
      if (list === DEFAULT_LIST) throw new Error("Missing required env var: LISTMONK_LIST_ID");
      skip(list);
      continue;
    }
    await confirmSubscription(email.toLowerCase(), listId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiter: per IP, fixed window, in memory.
//
// Resets whenever the function instance does. Signup is one POST per
// reader, ever; this only blunts a burst of junk addresses, which would
// otherwise turn into bounces against the sending reputation.
// ─────────────────────────────────────────────────────────────────────────────

const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_WINDOW = 5;
const RATE_SWEEP_AT = 10_000;
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function sweepExpired(now: number): void {
  for (const [ip, bucket] of ipBuckets) {
    if (bucket.resetAt < now) ipBuckets.delete(ip);
  }
}

export function checkRateLimit(ip: string, now: number = Date.now()): boolean {
  const bucket = ipBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    if (ipBuckets.size >= RATE_SWEEP_AT) sweepExpired(now);
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_MAX_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

export function _resetRateLimit(): void {
  ipBuckets.clear();
}

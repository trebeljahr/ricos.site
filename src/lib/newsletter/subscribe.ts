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

/**
 * Double opt-in for the Live and Learn newsletter.
 *
 * ListMonk, sending through SES, is the backend. `NEWSLETTER_PROVIDER=mailgun`
 * pins a deployment to Mailgun until the cutover: Vercel Production keeps
 * it until SES has production access and the subscribers are imported, and
 * removing it is the cutover. The Mailgun branches go once Mailgun is
 * decommissioned. Confirm links of both formats work under either provider.
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
 * `true` when the address is already a confirmed member, so the form can
 * say so instead of sending another confirmation email. A lookup error
 * counts as "no" so a hiccup falls through to the normal path.
 */
export async function isAlreadySubscribed(email: string): Promise<boolean> {
  try {
    return newsletterProvider() === "listmonk"
      ? await isConfirmedOnList(email)
      : await isOnMailgunList(email);
  } catch {
    return false;
  }
}

const CONFIRM_SUBJECT = "Confirm Signup to the Live and Learn Newsletter";

async function renderConfirmEmail(link: string) {
  const source = await readFile(
    path.join(process.cwd(), "src", "content", "email-templates", "confirmSubscription.hbs"),
    "utf-8",
  );
  return {
    subject: CONFIRM_SUBJECT,
    html: Handlebars.compile(source)({ confirmLink: link }),
    text: `You signed up for Live and Learn Newsletter. You can confirm your subscription by clicking this link ${link}`,
  };
}

/**
 * Mail the confirm link. A blocklisted address (a hard bounce, a spam
 * complaint, or a reader who blocklisted themselves on the unsubscribe
 * page) gets nothing, and the form answers as usual so it does not tell
 * a stranger which addresses are blocklisted.
 */
export async function sendConfirmationEmail(email: string): Promise<void> {
  if (newsletterProvider() === "listmonk") {
    if ((await findSubscriber(email))?.status === "blocklisted") {
      console.info(
        JSON.stringify({ scope: "newsletter.signup", event: "skipped", reason: "blocklisted" }),
      );
      return;
    }
    const { subject, html } = await renderConfirmEmail(confirmLink(email));
    await sendTransactional({ to: email, subject, html });
    return;
  }

  await addNewMemberToEmailList({ email, name: "", vars: { hash: await getLegacyHash(email) } });
  const { subject, html, text } = await renderConfirmEmail(await legacyConfirmLink(email));
  await sendMailgunEmail({
    from: "Rico Trebeljahr <rico@trebeljahr.com>",
    to: email,
    subject,
    html,
    text,
  });
}

/** Only call this once a confirm link has proven the reader owns `email`. */
export async function confirmAddress(email: string): Promise<void> {
  if (newsletterProvider() === "listmonk") {
    await confirmSubscription(email.toLowerCase());
    return;
  }
  await activateEmailListMember(email);
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

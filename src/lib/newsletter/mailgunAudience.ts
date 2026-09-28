/**
 * Read and tag the Live and Learn audience on Mailgun, for the move to
 * ListMonk (`pnpm newsletter:import`, `pnpm newsletter:sync-unsubscribes`).
 *
 * Always the production list, whatever NODE_ENV says. The ListMonk
 * instance is shared across projects: print addresses through `maskEmail`.
 *
 * Mailgun keeps no history per member, and `subscribed: no` means two
 * things: an unsubscribe, or a signup that was never confirmed (the site
 * adds every signup as `no` and flips it on the confirm click). So the
 * import tags each member it carries over with `IMPORTED_VAR`, and only a
 * tagged member that turns `no` later has unsubscribed from an issue.
 */

export const MAILGUN_API = "https://api.eu.mailgun.net/v3";
export const MAILGUN_DOMAIN = "newsletter.trebeljahr.com";
export const MAILGUN_LIST = `hi@${MAILGUN_DOMAIN}`;
export const SUPPRESSIONS = ["bounces", "complaints", "unsubscribes"] as const;
export type Suppression = (typeof SUPPRESSIONS)[number];

/** Member var holding the ISO time the import put this reader on ListMonk. */
export const IMPORTED_VAR = "listmonk_imported_at";

export type MailgunMember = {
  address: string;
  subscribed: boolean;
  vars?: Record<string, unknown>;
};

type Paged<T> = { items: T[]; paging?: { next?: string } };

function authHeader(): string {
  const key = process.env.MAILGUN_API_KEY;
  if (!key) throw new Error("Missing MAILGUN_API_KEY");
  return `Basic ${Buffer.from(`api:${key}`).toString("base64")}`;
}

async function mailgunPages<T>(firstUrl: string): Promise<T[]> {
  const auth = authHeader();
  const out: T[] = [];
  const seen = new Set<string>();
  let url: string | undefined = firstUrl;
  while (url && !seen.has(url)) {
    seen.add(url);
    const res = await fetch(url, { headers: { Authorization: auth } });
    if (!res.ok) throw new Error(`Mailgun GET ${url}: ${res.status} ${await res.text()}`);
    const page = (await res.json()) as Paged<T>;
    if (page.items.length === 0) break;
    out.push(...page.items);
    url = page.paging?.next;
  }
  return out;
}

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

/** Members of the production list, all of them unless `subscribed` narrows it. */
export async function fetchListMembers(subscribed?: "yes" | "no"): Promise<MailgunMember[]> {
  const filter = subscribed ? `subscribed=${subscribed}&` : "";
  return mailgunPages<MailgunMember>(
    `${MAILGUN_API}/lists/${MAILGUN_LIST}/members/pages?${filter}limit=100`,
  );
}

/** Every address on the domain's bounce, complaint and unsubscribe lists. */
export async function fetchSuppressions(): Promise<Map<string, Suppression[]>> {
  const suppressed = new Map<string, Suppression[]>();
  for (const kind of SUPPRESSIONS) {
    const items = await mailgunPages<{ address: string }>(
      `${MAILGUN_API}/${MAILGUN_DOMAIN}/${kind}?limit=1000`,
    );
    for (const { address } of items) {
      const email = normalizeAddress(address);
      suppressed.set(email, [...(suppressed.get(email) ?? []), kind]);
    }
  }
  return suppressed;
}

/** Replace a member's vars. Mailgun overwrites the whole set, so pass the merged one. */
async function putMemberVars(address: string, vars: Record<string, unknown>): Promise<void> {
  const url = `${MAILGUN_API}/lists/${MAILGUN_LIST}/members/${encodeURIComponent(address)}`;
  const form = new FormData();
  form.set("vars", JSON.stringify(vars));
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: authHeader() },
    body: form,
  });
  if (!res.ok) throw new Error(`Mailgun PUT ${url}: ${res.status} ${await res.text()}`);
}

export function isTaggedImported(member: MailgunMember): boolean {
  return typeof member.vars?.[IMPORTED_VAR] === "string";
}

/** Mark a member as carried over to ListMonk, keeping its other vars (the confirm hash). */
export async function tagImported(member: MailgunMember, at: Date): Promise<void> {
  await putMemberVars(member.address, { ...member.vars, [IMPORTED_VAR]: at.toISOString() });
}

/** Drop the import tag once the member's unsubscribe has reached ListMonk. */
export async function untagImported(member: MailgunMember): Promise<void> {
  const { [IMPORTED_VAR]: _dropped, ...rest } = member.vars ?? {};
  await putMemberVars(member.address, rest);
}

export function maskEmail(email: string): string {
  const [local, domain = ""] = email.split("@");
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${local.slice(0, 1)}***@${host.slice(0, 1)}***${tld}`;
}

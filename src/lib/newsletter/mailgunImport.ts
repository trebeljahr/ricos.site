import type { ListmonkSubscriber } from "./listmonk";
import {
  type MailgunMember,
  normalizeAddress,
  SUPPRESSIONS,
  type Suppression,
} from "./mailgunAudience";

/**
 * What `pnpm newsletter:import` does with each Mailgun address, worked out
 * before anything is written so the dry run reports the exact outcome.
 *
 * Consent carries over as it stands, never upgraded:
 *
 *   - Only `subscribed: yes` members off every suppression list are
 *     imported, as `confirmed`. A `subscribed: no` member is either an
 *     unsubscribe or a signup that never confirmed; Mailgun cannot tell
 *     them apart, so neither goes to ListMonk.
 *   - Every address on the domain's suppression lists, member or not, is
 *     carried over as a suppression: a hard bounce or a spam complaint as
 *     `blocklisted`, so a later signup gets no confirmation email and SES
 *     never sees the address; an unsubscribe as an `unsubscribed`
 *     membership on the live list.
 *   - ListMonk's own state wins over Mailgun's: a subscriber blocklisted
 *     or disabled on the shared instance, or with any membership on the
 *     live list, is left exactly as it is. A suppressed address that
 *     another project already has is never blocklisted instance-wide,
 *     only given an `unsubscribed` membership on the live list.
 */

export type ImportOutcome =
  /** Not on ListMonk: created, confirmed on the live list. */
  | "create"
  /** On ListMonk (other projects' lists, or `unconfirmed` on ours): confirmed on the live list. */
  | "add"
  | "alreadyConfirmed"
  | "skipUnsubscribed"
  | "skipBlocklisted"
  | "skipDisabled";

export const IMPORT_OUTCOMES: ImportOutcome[] = [
  "create",
  "add",
  "alreadyConfirmed",
  "skipUnsubscribed",
  "skipBlocklisted",
  "skipDisabled",
];

export function importOutcome(
  subscriber: ListmonkSubscriber | null,
  listId: number,
): ImportOutcome {
  if (!subscriber) return "create";
  if (subscriber.status === "blocklisted") return "skipBlocklisted";
  if (subscriber.status !== "enabled") return "skipDisabled";
  const membership = subscriber.lists?.find((l) => l.id === listId)?.subscription_status;
  if (membership === "unsubscribed") return "skipUnsubscribed";
  if (membership === "confirmed") return "alreadyConfirmed";
  return "add";
}

/** How a Mailgun suppression lands on ListMonk. */
export type SuppressionMark = "blocklisted" | "unsubscribed";

export function suppressionMark(kinds: Suppression[]): SuppressionMark {
  return kinds.includes("bounces") || kinds.includes("complaints") ? "blocklisted" : "unsubscribed";
}

export type SuppressedOutcome =
  /** Not on ListMonk: created with the mark (see `createSuppressed`). */
  | "create"
  /** On ListMonk for other projects only: given an `unsubscribed` membership on the live list. */
  | "addUnsubscribed"
  | "alreadyBlocklisted"
  /** Has a membership on the live list: ListMonk's state is newer, left alone. */
  | "keepMembership";

export const SUPPRESSED_OUTCOMES: SuppressedOutcome[] = [
  "create",
  "addUnsubscribed",
  "alreadyBlocklisted",
  "keepMembership",
];

export function suppressedOutcome(
  subscriber: ListmonkSubscriber | null,
  listId: number,
): SuppressedOutcome {
  if (!subscriber) return "create";
  if (subscriber.status === "blocklisted") return "alreadyBlocklisted";
  if (subscriber.lists?.some((l) => l.id === listId)) return "keepMembership";
  return "addUnsubscribed";
}

export type ImportEntry = { email: string; member: MailgunMember; outcome: ImportOutcome };

export type SuppressedEntry = {
  email: string;
  kinds: Suppression[];
  mark: SuppressionMark;
  /** On the Mailgun list, in any state. */
  member: boolean;
  outcome: SuppressedOutcome;
  /** The ListMonk subscriber, when there is one. */
  subscriberId?: number;
};

export type ImportPlan = {
  /** Distinct addresses on the Mailgun list. */
  members: number;
  subscribed: number;
  /** `subscribed: no`: unsubscribed, or never confirmed. Not imported. */
  notSubscribed: number;
  /** Subscribed, but on a suppression list: carried over as a suppression, not confirmed. */
  subscribedSuppressed: number;
  /** Distinct addresses on the domain's suppression lists, members or not. */
  suppressedTotal: number;
  /** Suppressed addresses by list; an address can be on several. */
  suppressed: Record<Suppression, number>;
  entries: ImportEntry[];
  suppressedEntries: SuppressedEntry[];
};

export async function planImport({
  members,
  suppressions,
  listId,
  lookup,
}: {
  members: MailgunMember[];
  suppressions: Map<string, Suppression[]>;
  listId: number;
  lookup: (email: string) => Promise<ListmonkSubscriber | null>;
}): Promise<ImportPlan> {
  // A subscribed entry wins over a duplicate that is not.
  const byEmail = new Map<string, MailgunMember>();
  for (const member of members) {
    const email = normalizeAddress(member.address);
    if (!byEmail.get(email)?.subscribed) byEmail.set(email, member);
  }

  const subscribed = [...byEmail].filter(([, m]) => m.subscribed);
  const entries: ImportEntry[] = [];
  let subscribedSuppressed = 0;
  for (const [email, member] of subscribed.sort(([a], [b]) => a.localeCompare(b))) {
    if (suppressions.has(email)) {
      subscribedSuppressed++;
      continue;
    }
    entries.push({ email, member, outcome: importOutcome(await lookup(email), listId) });
  }

  const suppressed = Object.fromEntries(SUPPRESSIONS.map((kind) => [kind, 0])) as Record<
    Suppression,
    number
  >;
  const suppressedEntries: SuppressedEntry[] = [];
  for (const [email, raw] of [...suppressions].sort(([a], [b]) => a.localeCompare(b))) {
    const kinds = [...new Set(raw)];
    for (const kind of kinds) suppressed[kind]++;
    const subscriber = await lookup(email);
    suppressedEntries.push({
      email,
      kinds,
      mark: suppressionMark(kinds),
      member: byEmail.has(email),
      outcome: suppressedOutcome(subscriber, listId),
      ...(subscriber ? { subscriberId: subscriber.id } : {}),
    });
  }

  return {
    members: byEmail.size,
    subscribed: subscribed.length,
    notSubscribed: byEmail.size - subscribed.length,
    subscribedSuppressed,
    suppressedTotal: suppressions.size,
    suppressed,
    entries,
    suppressedEntries,
  };
}

export function countOutcomes(entries: ImportEntry[]): Record<ImportOutcome, number> {
  const counts = Object.fromEntries(IMPORT_OUTCOMES.map((o) => [o, 0])) as Record<
    ImportOutcome,
    number
  >;
  for (const { outcome } of entries) counts[outcome]++;
  return counts;
}

export function countSuppressedOutcomes(
  entries: SuppressedEntry[],
  mark: SuppressionMark,
): Record<SuppressedOutcome, number> {
  const counts = Object.fromEntries(SUPPRESSED_OUTCOMES.map((o) => [o, 0])) as Record<
    SuppressedOutcome,
    number
  >;
  for (const entry of entries) if (entry.mark === mark) counts[entry.outcome]++;
  return counts;
}

import type { ListmonkSubscriber } from "./listmonk";
import {
  type MailgunMember,
  normalizeAddress,
  SUPPRESSIONS,
  type Suppression,
} from "./mailgunAudience";

/**
 * What `pnpm newsletter:import` does with each Mailgun reader, worked out
 * before anything is written so the dry run reports the exact outcome.
 *
 * Consent carries over as it stands, never upgraded:
 *
 *   - Only `subscribed: yes` members off every suppression list are
 *     imported, as `confirmed`. A `subscribed: no` member is either an
 *     unsubscribe or a signup that never confirmed; Mailgun cannot tell
 *     them apart, so neither goes to ListMonk.
 *   - ListMonk's own state wins over Mailgun's: a subscriber blocklisted
 *     or disabled on the shared instance, or `unsubscribed` from the live
 *     list, is left exactly as it is.
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

export type ImportEntry = { email: string; member: MailgunMember; outcome: ImportOutcome };

export type ImportPlan = {
  /** Distinct addresses on the Mailgun list. */
  members: number;
  subscribed: number;
  /** `subscribed: no`: unsubscribed, or never confirmed. Not imported. */
  notSubscribed: number;
  /** Subscribed, but on a Mailgun suppression list. Not imported. */
  suppressed: Record<Suppression, number>;
  suppressedTotal: number;
  entries: ImportEntry[];
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
  const suppressed = Object.fromEntries(SUPPRESSIONS.map((kind) => [kind, 0])) as Record<
    Suppression,
    number
  >;
  let suppressedTotal = 0;
  const entries: ImportEntry[] = [];
  for (const [email, member] of subscribed.sort(([a], [b]) => a.localeCompare(b))) {
    const kinds = suppressions.get(email);
    if (kinds) {
      suppressedTotal++;
      for (const kind of kinds) suppressed[kind]++;
      continue;
    }
    entries.push({ email, member, outcome: importOutcome(await lookup(email), listId) });
  }

  return {
    members: byEmail.size,
    subscribed: subscribed.length,
    notSubscribed: byEmail.size - subscribed.length,
    suppressed,
    suppressedTotal,
    entries,
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

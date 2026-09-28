import { findSubscriber, getLiveList, listmonkBaseUrl, unsubscribeFromList } from "./listmonk";
import {
  fetchListMembers,
  fetchSuppressions,
  isTaggedImported,
  MAILGUN_LIST,
  type MailgunMember,
  maskEmail,
  normalizeAddress,
  SUPPRESSIONS,
  type Suppression,
  untagImported,
} from "./mailgunAudience";

/**
 * Copy Mailgun unsubscribes into ListMonk while issues sent through
 * Mailgun are still around. Their unsubscribe links point at Mailgun, so
 * a click there leaves the reader confirmed on the live ListMonk list.
 *
 * Only members the import tagged count (see mailgunAudience.ts): an
 * untagged `subscribed: no` member is a signup that was never confirmed
 * on Mailgun, and may well have confirmed on ListMonk since. A tagged
 * member that is now `subscribed: no`, or on the bounce, complaint or
 * unsubscribe list, is unsubscribed from the live list, and its tag is
 * cleared so a later signup on ListMonk stays put. Re-running finds
 * nothing new.
 */

export type Reason = "list" | Suppression;
export type Departure = { member: MailgunMember; email: string; reasons: Reason[] };

/** Tagged members Mailgun no longer mails: unsubscribed from the list, or suppressed. */
export function findDepartures(
  members: MailgunMember[],
  suppressed: Map<string, Suppression[]>,
): Departure[] {
  const departures: Departure[] = [];
  for (const member of members) {
    if (!isTaggedImported(member)) continue;
    const email = normalizeAddress(member.address);
    const reasons: Reason[] = [
      ...(member.subscribed ? [] : (["list"] as const)),
      ...(suppressed.get(email) ?? []),
    ];
    if (reasons.length > 0) departures.push({ member, email, reasons });
  }
  return departures.sort((a, b) => a.email.localeCompare(b.email));
}

export type SyncReport = {
  departures: Departure[];
  /** Confirmed on the live list, so unsubscribed there (or would be, on a dry run). */
  toUnsubscribe: Departure[];
  applied: boolean;
};

export async function syncUnsubscribes({
  apply,
  log = console.info,
}: {
  apply: boolean;
  log?: (line: string) => void;
}): Promise<SyncReport> {
  const members = await fetchListMembers();
  const suppressed = await fetchSuppressions();
  const departures = findDepartures(members, suppressed);

  const tagged = members.filter(isTaggedImported).length;
  const neverImported = members.filter((m) => !m.subscribed && !isTaggedImported(m)).length;
  log(`Mailgun list ${MAILGUN_LIST}: ${members.length} members, ${tagged} tagged by the import`);
  log(`  ignored, not subscribed and never imported: ${neverImported}`);
  log(`Imported readers Mailgun no longer mails: ${departures.length}`);
  for (const reason of ["list", ...SUPPRESSIONS] as const) {
    const n = departures.filter((d) => d.reasons.includes(reason)).length;
    log(`  ${reason === "list" ? "unsubscribed from the list" : `on ${reason}`}: ${n}`);
  }

  const list = await getLiveList();
  log(`Target: ${listmonkBaseUrl()} list ${list.id} "${list.name}"`);

  const toUnsubscribe: Departure[] = [];
  const subscriberIds: number[] = [];
  for (const departure of departures) {
    const subscriber = await findSubscriber(departure.email);
    const status = subscriber?.lists?.find((l) => l.id === list.id)?.subscription_status;
    if (subscriber && status === "confirmed") {
      toUnsubscribe.push(departure);
      subscriberIds.push(subscriber.id);
    }
  }
  log(`Still confirmed on ListMonk, to unsubscribe: ${toUnsubscribe.length}`);
  for (const { email, reasons } of toUnsubscribe) {
    log(`  ${maskEmail(email)} (${reasons.join(", ")})`);
  }
  log(`Already off the list, tag to clear: ${departures.length - toUnsubscribe.length}`);

  if (!apply) {
    log("Dry run: nothing written. Re-run with --apply to unsubscribe them.");
    return { departures, toUnsubscribe, applied: false };
  }

  // ListMonk first: if it fails, the tags stay and the next run retries.
  await unsubscribeFromList(subscriberIds, list.id);
  for (const { member } of departures) await untagImported(member);
  log(
    `Unsubscribed ${toUnsubscribe.length} from list ${list.id}, ` +
      `cleared the import tag on ${departures.length} Mailgun members.`,
  );
  return { departures, toUnsubscribe, applied: true };
}

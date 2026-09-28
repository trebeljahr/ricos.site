/**
 * One-off: move the confirmed Live and Learn readers from Mailgun to ListMonk.
 *
 *   pnpm newsletter:import           → dry run: counts and a masked sample, writes nothing
 *   pnpm newsletter:import --apply   → add them to LISTMONK_LIVE_LIST_ID as `confirmed`
 *
 * Takes the `subscribed: yes` members of the Mailgun list, drops every
 * address on the domain's bounce, complaint and unsubscribe lists, and adds
 * the rest to the live ListMonk list as `confirmed` (preconfirmed, so
 * ListMonk sends no opt-in email). Safe to re-run: members already
 * confirmed are left alone, and anyone who has since unsubscribed from
 * the ListMonk list or been blocklisted is skipped.
 *
 * Each member that ends up confirmed on ListMonk gets the import tag on
 * Mailgun, which `pnpm newsletter:sync-unsubscribes` needs to tell a
 * later unsubscribe from a signup that was never confirmed.
 *
 * Run it at the cutover, not before, so Mailgun unsubscribes up to that
 * moment carry over. The ListMonk instance is shared: output masks every
 * address.
 */
import "dotenv/config";
import {
  confirmSubscription,
  findSubscriber,
  getLiveList,
  listmonkBaseUrl,
} from "src/lib/newsletter/listmonk.js";
import {
  fetchListMembers,
  fetchSuppressions,
  isTaggedImported,
  MAILGUN_LIST,
  type MailgunMember,
  maskEmail,
  normalizeAddress,
  SUPPRESSIONS,
  tagImported,
} from "src/lib/newsletter/mailgunAudience.js";

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const unknownArgs = args.filter((arg) => arg !== "--apply");
  if (unknownArgs.length > 0) {
    console.error(
      `Unknown argument: ${unknownArgs.join(" ")}\nusage: pnpm newsletter:import [--apply]`,
    );
    process.exit(1);
  }

  const byEmail = new Map<string, MailgunMember>();
  for (const member of await fetchListMembers("yes")) {
    const email = normalizeAddress(member.address);
    if (member.subscribed && !byEmail.has(email)) byEmail.set(email, member);
  }
  const subscribed = [...byEmail.keys()];
  const suppressed = await fetchSuppressions();

  const dropped = subscribed.filter((email) => suppressed.has(email));
  const toImport = subscribed.filter((email) => !suppressed.has(email)).sort();

  console.info(`Mailgun list ${MAILGUN_LIST}: ${subscribed.length} subscribed`);
  for (const kind of SUPPRESSIONS) {
    const n = dropped.filter((email) => suppressed.get(email)?.includes(kind)).length;
    console.info(`  dropped, on ${kind}: ${n}`);
  }
  console.info(`To import: ${toImport.length}`);
  const step = Math.max(1, Math.floor(toImport.length / 8));
  const sample = toImport.filter((_, i) => i % step === 0).slice(0, 8);
  console.info(`Sample: ${sample.map(maskEmail).join(", ")}`);

  const list = await getLiveList();
  const listId = list.id;
  console.info(
    `Target: ${listmonkBaseUrl()} list ${list.id} "${list.name}" (${list.optin} opt-in), ` +
      `${list.subscriber_statuses?.confirmed ?? 0} confirmed now`,
  );
  if (list.optin !== "double") throw new Error(`List "${list.name}" must be double opt-in`);

  if (!apply) {
    console.info("Dry run: nothing written. Re-run with --apply to import.");
    return;
  }

  const importedAt = new Date();
  const tally = { added: 0, alreadyConfirmed: 0, unsubscribed: 0, blocklisted: 0, tagged: 0 };
  for (const email of toImport) {
    const existing = await findSubscriber(email);
    const membership = existing?.lists?.find((l) => l.id === listId);
    if (existing?.status === "blocklisted") {
      tally.blocklisted++;
    } else if (membership?.subscription_status === "unsubscribed") {
      tally.unsubscribed++;
    } else {
      if (membership?.subscription_status === "confirmed") {
        tally.alreadyConfirmed++;
      } else {
        await confirmSubscription(email, listId);
        tally.added++;
      }
      const member = byEmail.get(email);
      if (member && !isTaggedImported(member)) {
        await tagImported(member, importedAt);
        tally.tagged++;
      }
    }
  }
  console.info(
    `Imported: ${tally.added} added, ${tally.alreadyConfirmed} already confirmed, ` +
      `skipped ${tally.unsubscribed} unsubscribed and ${tally.blocklisted} blocklisted. ` +
      `Tagged ${tally.tagged} on Mailgun.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

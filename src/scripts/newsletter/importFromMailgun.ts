/**
 * One-off: move the confirmed Live and Learn readers from Mailgun to ListMonk.
 *
 *   pnpm newsletter:import           → dry run: exact outcome counts and a masked sample, writes nothing
 *   pnpm newsletter:import --apply   → add them to LISTMONK_LIVE_LIST_ID as `confirmed`
 *
 * Takes the `subscribed: yes` members of the Mailgun list, drops every
 * address on the domain's bounce, complaint and unsubscribe lists, and
 * adds the rest to the live ListMonk list as `confirmed`. What each reader
 * gets is decided up front (src/lib/newsletter/mailgunImport.ts): nobody
 * blocklisted, disabled or unsubscribed on ListMonk is touched, and nobody
 * not confirmed on Mailgun is imported.
 *
 * ListMonk sends no opt-in email for any of it: new subscribers are
 * created with `preconfirm_subscriptions`, and existing ones are added
 * through `PUT /api/subscribers/lists` with status `confirmed`, which
 * never mails.
 *
 * Each member that ends up confirmed on ListMonk gets the import tag on
 * Mailgun, which `pnpm newsletter:sync-unsubscribes` needs to tell a
 * later unsubscribe from a signup that was never confirmed.
 *
 * Safe to re-run; after an --apply, a dry run should show every reader as
 * already confirmed. The ListMonk instance is shared: output masks every
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
  maskEmail,
  SUPPRESSIONS,
  tagImported,
} from "src/lib/newsletter/mailgunAudience.js";
import { countOutcomes, type ImportOutcome, planImport } from "src/lib/newsletter/mailgunImport.js";

const OUTCOME_LABELS: Record<ImportOutcome, string> = {
  create: "new to ListMonk, created as confirmed",
  add: "already on ListMonk, confirmed on this list",
  alreadyConfirmed: "already confirmed on this list, untouched",
  skipUnsubscribed: "skipped, unsubscribed from this list on ListMonk",
  skipBlocklisted: "skipped, blocklisted on ListMonk",
  skipDisabled: "skipped, disabled on ListMonk",
};

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

  const list = await getLiveList();
  if (list.optin !== "double") throw new Error(`List "${list.name}" must be double opt-in`);
  console.info(
    `Target: ${listmonkBaseUrl()} list ${list.id} "${list.name}" (${list.optin} opt-in), ` +
      `~${list.subscriber_statuses?.confirmed ?? 0} confirmed now`,
  );

  const plan = await planImport({
    members: await fetchListMembers(),
    suppressions: await fetchSuppressions(),
    listId: list.id,
    lookup: findSubscriber,
  });
  const counts = countOutcomes(plan.entries);

  console.info(`Mailgun list ${MAILGUN_LIST}: ${plan.members} members`);
  console.info(
    `  not subscribed (unsubscribed or never confirmed), not imported: ${plan.notSubscribed}`,
  );
  console.info(`  subscribed: ${plan.subscribed}`);
  console.info(`  subscribed but suppressed, not imported: ${plan.suppressedTotal}`);
  for (const kind of SUPPRESSIONS) console.info(`    on ${kind}: ${plan.suppressed[kind]}`);
  console.info(`Readers to carry over: ${plan.entries.length}`);
  for (const [outcome, label] of Object.entries(OUTCOME_LABELS)) {
    console.info(`  ${label}: ${counts[outcome as ImportOutcome]}`);
  }
  const toWrite = plan.entries.filter((e) => e.outcome === "create" || e.outcome === "add");
  const step = Math.max(1, Math.floor(toWrite.length / 8));
  const sample = toWrite.filter((_, i) => i % step === 0).slice(0, 8);
  console.info(`Sample of writes: ${sample.map((e) => maskEmail(e.email)).join(", ") || "none"}`);

  if (!apply) {
    console.info("Dry run: nothing written. Re-run with --apply to import.");
    return;
  }

  const importedAt = new Date();
  let written = 0;
  let tagged = 0;
  for (const { email, member, outcome } of plan.entries) {
    if (outcome === "create" || outcome === "add") {
      await confirmSubscription(email, list.id);
      written++;
    } else if (outcome !== "alreadyConfirmed") {
      continue;
    }
    if (!isTaggedImported(member)) {
      await tagImported(member, importedAt);
      tagged++;
    }
  }
  console.info(
    `Imported: ${written} confirmed on list ${list.id}, ${counts.alreadyConfirmed} already were. ` +
      `Tagged ${tagged} on Mailgun. Re-run without --apply to check: all should be already confirmed.`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

/**
 * One-off: move the confirmed Live and Learn readers from Mailgun to ListMonk.
 *
 *   pnpm newsletter:import           → dry run: exact outcome counts and a masked sample, writes nothing
 *   pnpm newsletter:import --apply   → add them to LISTMONK_LIVE_LIST_ID as `confirmed`
 *
 * Takes the `subscribed: yes` members of the Mailgun list that are on no
 * suppression list and adds them to the live ListMonk list as `confirmed`.
 * Every address on the domain's bounce and complaint lists becomes
 * blocklisted, and every one on its unsubscribe list gets an
 * `unsubscribed` membership on the live list. What each address gets is
 * decided up front (src/lib/newsletter/mailgunImport.ts): nobody
 * blocklisted, disabled or already on the live list on ListMonk is
 * touched, nobody not confirmed on Mailgun is confirmed, and nobody
 * another project has is blocklisted instance-wide.
 *
 * ListMonk sends no opt-in email for any of it: new subscribers are
 * created with `preconfirm_subscriptions`, and existing ones are added
 * through `PUT /api/subscribers/lists`, which never mails.
 *
 * Each member that ends up confirmed on ListMonk gets the import tag on
 * Mailgun, which `pnpm newsletter:sync-unsubscribes` needs to tell a
 * later unsubscribe from a signup that was never confirmed.
 *
 * Safe to re-run; after an --apply, a dry run should show every reader as
 * already confirmed and every suppression as already carried over. The
 * ListMonk instance is shared: output masks every address.
 */
import "dotenv/config";
import {
  addToList,
  confirmSubscription,
  createSuppressed,
  findSubscriber,
  getLiveList,
  ListmonkError,
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
import {
  countOutcomes,
  countSuppressedOutcomes,
  type ImportOutcome,
  planImport,
  type SuppressedOutcome,
  type SuppressionMark,
} from "src/lib/newsletter/mailgunImport.js";

const OUTCOME_LABELS: Record<ImportOutcome, string> = {
  create: "new to ListMonk, created as confirmed",
  add: "already on ListMonk, confirmed on this list",
  alreadyConfirmed: "already confirmed on this list, untouched",
  skipUnsubscribed: "skipped, unsubscribed from this list on ListMonk",
  skipBlocklisted: "skipped, blocklisted on ListMonk",
  skipDisabled: "skipped, disabled on ListMonk",
};

const SUPPRESSED_LABELS: Record<SuppressionMark, Record<SuppressedOutcome, string>> = {
  blocklisted: {
    create: "new to ListMonk, created blocklisted",
    addUnsubscribed: "on ListMonk for other lists, unsubscribed on this list only",
    alreadyBlocklisted: "already blocklisted on ListMonk, untouched",
    keepMembership: "already on this list, left as ListMonk has it",
  },
  unsubscribed: {
    create: "new to ListMonk, created unsubscribed on this list",
    addUnsubscribed: "on ListMonk for other lists, unsubscribed on this list",
    alreadyBlocklisted: "already blocklisted on ListMonk, untouched",
    keepMembership: "already on this list, left as ListMonk has it",
  },
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
  console.info(
    `  subscribed but suppressed, carried over as a suppression: ${plan.subscribedSuppressed}`,
  );
  console.info(`Readers to confirm: ${plan.entries.length}`);
  for (const [outcome, label] of Object.entries(OUTCOME_LABELS)) {
    console.info(`  ${label}: ${counts[outcome as ImportOutcome]}`);
  }

  const onList = plan.suppressedEntries.filter((e) => e.member).length;
  console.info(
    `Mailgun suppressions: ${plan.suppressedTotal} addresses, ${onList} of them on the list ` +
      `(${SUPPRESSIONS.map((kind) => `${kind} ${plan.suppressed[kind]}`).join(", ")})`,
  );
  for (const mark of ["blocklisted", "unsubscribed"] as const) {
    const n = plan.suppressedEntries.filter((e) => e.mark === mark).length;
    const why = mark === "blocklisted" ? "bounce or complaint" : "unsubscribe only";
    console.info(`  to keep ${mark} (${why}): ${n}`);
    const markCounts = countSuppressedOutcomes(plan.suppressedEntries, mark);
    for (const [outcome, label] of Object.entries(SUPPRESSED_LABELS[mark])) {
      console.info(`    ${label}: ${markCounts[outcome as SuppressedOutcome]}`);
    }
  }

  const toWrite = [
    ...plan.entries.filter((e) => e.outcome === "create" || e.outcome === "add"),
    ...plan.suppressedEntries.filter(
      (e) => e.outcome === "create" || e.outcome === "addUnsubscribed",
    ),
  ];
  const step = Math.max(1, Math.floor(toWrite.length / 8));
  const sample = toWrite.filter((_, i) => i % step === 0).slice(0, 8);
  console.info(
    `Writes: ${toWrite.length}. Sample: ${sample.map((e) => maskEmail(e.email)).join(", ") || "none"}`,
  );

  if (!apply) {
    console.info("Dry run: nothing written. Re-run with --apply to import.");
    return;
  }

  // ListMonk answers 400 for an address it will not store (its own email
  // check is stricter than Mailgun's). Report those and carry on; any
  // other error stops the run, and a re-run picks up where it stopped.
  const rejected: string[] = [];
  async function write(email: string, run: () => Promise<void>): Promise<boolean> {
    try {
      await run();
      return true;
    } catch (err) {
      if (!(err instanceof ListmonkError && err.status === 400)) throw err;
      rejected.push(email);
      return false;
    }
  }

  // Suppressions first: if the run stops half way, nobody has been
  // confirmed ahead of the opt-outs.
  let suppressedWritten = 0;
  const addUnsubscribedIds: number[] = [];
  for (const { email, mark, outcome, subscriberId } of plan.suppressedEntries) {
    if (outcome === "create") {
      if (await write(email, () => createSuppressed(email, list.id, mark))) suppressedWritten++;
    } else if (outcome === "addUnsubscribed" && subscriberId) {
      addUnsubscribedIds.push(subscriberId);
    }
  }
  await addToList(addUnsubscribedIds, list.id, "unsubscribed");
  suppressedWritten += addUnsubscribedIds.length;

  const importedAt = new Date();
  let written = 0;
  let tagged = 0;
  for (const { email, member, outcome } of plan.entries) {
    if (outcome === "create" || outcome === "add") {
      if (!(await write(email, () => confirmSubscription(email, list.id)))) continue;
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
      `Carried over ${suppressedWritten} suppressions. Tagged ${tagged} on Mailgun. ` +
      "Re-run without --apply to check: nothing should be left to write.",
  );
  if (rejected.length > 0) {
    console.info(
      `Rejected by ListMonk as invalid, not written: ${rejected.length} (${rejected.map(maskEmail).join(", ")})`,
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

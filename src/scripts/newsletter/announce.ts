/**
 * Draft the "a new thing is out" email for an entry in src/lib/announcements.ts.
 *
 *   pnpm newsletter:announce <slug>             → create a DRAFT campaign on LISTMONK_ANNOUNCE_LIST_ID
 *   pnpm newsletter:announce <slug> --dry-run   → print the email, touch nothing
 *
 * Never sends: edit the draft and start it in the ListMonk admin UI. The
 * entry's date does not matter here, so the draft can wait for launch day.
 */
import { ANNOUNCEMENTS, resolveAnnouncement } from "src/lib/announcements.js";
import { announceEmail } from "src/lib/newsletter/announceEmail.js";
import { createDraftCampaign, getList } from "src/lib/newsletter/listmonk.js";
import { listIdFor } from "src/lib/newsletter/lists.js";

const USAGE = "usage: pnpm newsletter:announce <slug> [--dry-run]";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positional = args.filter((arg) => arg !== "--dry-run");
  if (positional.length !== 1 || positional[0].startsWith("-")) {
    console.error(USAGE);
    process.exit(1);
  }
  const [slug] = positional;

  const entry = ANNOUNCEMENTS.find((a) => a.slug === slug);
  if (!entry) {
    const known = ANNOUNCEMENTS.map((a) => a.slug);
    throw new Error(
      `No announcement for "${slug}" in src/lib/announcements.ts. Known: ${known.join(", ") || "none"}.`,
    );
  }
  const email = announceEmail(resolveAnnouncement(entry));

  if (dryRun) {
    console.log(`Subject: ${email.subject}\n\n${email.text}`);
    return;
  }

  const listId = listIdFor("announce");
  if (listId === null) {
    throw new Error("Set LISTMONK_ANNOUNCE_LIST_ID to the announce list id first.");
  }
  // A single-opt-in list would mail unconfirmed members once the draft starts.
  const list = await getList(listId);
  if (list.optin !== "double") {
    throw new Error(
      `List ${list.id} "${list.name}" is ${list.optin} opt-in; make it double first.`,
    );
  }

  const draft = await createDraftCampaign({ listId, ...email });
  console.log(
    `Draft campaign ${draft.id} on "${list.name}" (${list.subscriber_count} subscribers).\n` +
      `Nothing was sent. Review and start it at ${draft.url}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

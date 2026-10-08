/**
 * Draft the "new chapter" email for a published How computers work chapter.
 *
 *   pnpm newsletter:chapter <slug>             → create a DRAFT campaign on LISTMONK_COMPUTER_LIST_ID
 *   pnpm newsletter:chapter <slug> --dry-run   → print the email, touch nothing
 *
 * Reads .velite/computerChapters.json, so run a build (or the dev server)
 * after publishing the chapter. Never sends: review the draft and start it
 * in the ListMonk admin UI. See src/lib/newsletter/chapterAlert.ts.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  type ChapterEntry,
  chapterAlertEmail,
  findPublishedChapter,
} from "src/lib/newsletter/chapterAlert.js";
import { createDraftCampaign, getList } from "src/lib/newsletter/listmonk.js";
import { listIdFor } from "src/lib/newsletter/lists.js";
import { newsletterProvider } from "src/lib/newsletter/subscribe.js";

const USAGE = "usage: pnpm newsletter:chapter <slug> [--dry-run]";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const positional = args.filter((arg) => arg !== "--dry-run");
  if (positional.length !== 1 || positional[0].startsWith("-")) {
    console.error(USAGE);
    process.exit(1);
  }
  const [slug] = positional;

  const chaptersFile = path.join(process.cwd(), ".velite", "computerChapters.json");
  const chapters = JSON.parse(await readFile(chaptersFile, "utf-8")) as ChapterEntry[];
  const email = chapterAlertEmail(findPublishedChapter(chapters, slug));

  if (dryRun) {
    console.log(`Subject: ${email.subject}\n\n${email.text}`);
    return;
  }

  if (newsletterProvider() !== "listmonk") {
    throw new Error(
      "Chapter alerts live on ListMonk; unset NEWSLETTER_PROVIDER=mailgun to draft one.",
    );
  }
  const listId = listIdFor("computer");
  if (listId === null) {
    throw new Error("Set LISTMONK_COMPUTER_LIST_ID to the chapter alerts list id first.");
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

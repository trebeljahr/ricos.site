/**
 * Marks Rico's feedback on a rejected demo as addressed. The note moves to the
 * demo's finished rounds with what was done about it, and the demo goes to the end
 * of his review queue.
 *
 *   pnpm demo:addressed <slug> "<what changed>" [commit]
 *
 * The record is in the main checkout's private Notes, also when run from a worktree.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { computerDemos } from "src/lib/computerDemos";
import { markAddressed } from "src/lib/demoReview";
import { readDemoReviews, writeDemoReviews } from "src/lib/demoReviewStore";

const [slug, summary, commit] = process.argv.slice(2);
if (!slug || !summary) {
  console.error('Usage: pnpm demo:addressed <slug> "<what changed>" [commit]');
  process.exit(1);
}
if (!computerDemos.some((demo) => demo.slug === slug)) {
  console.error(`Unknown demo: ${slug}`);
  process.exit(1);
}

if (!process.env.DIARY_TEXTS_DIR) {
  const gitDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    encoding: "utf8",
  }).trim();
  process.env.DIARY_TEXTS_DIR = path.join(path.dirname(gitDir), "src/content/Notes/texts");
}

try {
  const reviews = markAddressed(readDemoReviews(), slug, { summary, commit }, new Date());
  writeDemoReviews(reviews);
  console.log(`${slug}: round ${reviews[slug].rounds?.length} addressed, back in the queue`);
} catch (error) {
  console.error(String(error));
  process.exit(1);
}

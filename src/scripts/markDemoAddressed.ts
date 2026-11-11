/**
 * Marks Rico's feedback on a rejected demo as addressed. The note moves to the
 * demo's finished rounds with what was done about it, and the demo goes to the end
 * of his review queue.
 *
 *   pnpm demo:addressed <slug> "<what changed>" [commit]    computer demos
 *   pnpm piano:addressed <slug> "<what changed>" [commit]   piano demos
 *
 * The record is in the main checkout's private Notes, also when run from a worktree.
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { markAddressed } from "src/lib/demoReview";
import { isReviewSeries, REVIEW_SERIES } from "src/lib/demoReviewSeries";
import { readDemoReviews, writeDemoReviews } from "src/lib/demoReviewStore";

const args = process.argv.slice(2);
const flag = args[0]?.startsWith("--series=") ? args.shift()?.slice("--series=".length) : undefined;
const series = flag ?? "computer";
const [slug, summary, commit] = args;
const command = series === "computer" ? "demo:addressed" : `${series}:addressed`;
if (!isReviewSeries(series) || !slug || !summary) {
  console.error(`Usage: pnpm ${command} <slug> "<what changed>" [commit]`);
  process.exit(1);
}

if (!process.env.DIARY_TEXTS_DIR) {
  const gitDir = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], {
    encoding: "utf8",
  }).trim();
  process.env.DIARY_TEXTS_DIR = path.join(path.dirname(gitDir), "src/content/Notes/texts");
}

try {
  if (!REVIEW_SERIES[series].demos.some((demo) => demo.slug === slug)) {
    throw new Error(`${slug} is not a ${series} demo`);
  }
  const reviews = markAddressed(readDemoReviews(series), slug, { summary, commit }, new Date());
  writeDemoReviews(series, reviews);
  console.log(`${slug}: round ${reviews[slug].rounds?.length} addressed, back in the queue`);
} catch (error) {
  console.error(String(error));
  process.exit(1);
}

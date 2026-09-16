// Round-trips quotes.json through a Markdown file that reads well in Obsidian,
// so quotes, authors and tags can be curated there and written back.
//
//   pnpm quotes:export [review.md]   quotes.json -> review file
//   pnpm quotes:apply  [review.md]   review file -> quotes.json
//
// Run from the main checkout: the review file lives in the vault's AI folder.
//
// Format, one section per quote. Order in the file is order on the page;
// delete a section to drop a quote.
//
//   ### 001 · Author Name
//   > First line of the quote
//   > second line
//
//   tags: meaning, craft
//   source: [Book Title](/booknotes/book-slug)

import fs from "node:fs";
import {
  DEFAULT_REVIEW,
  formatReview,
  parseReview,
  QUOTES_JSON,
  type Quote,
} from "./quoteReviewFormat";

function main() {
  const [command, reviewArg] = process.argv.slice(2);
  const reviewPath = reviewArg ?? DEFAULT_REVIEW;

  if (command === "export") {
    const quotes: Quote[] = JSON.parse(fs.readFileSync(QUOTES_JSON, "utf8"));
    fs.writeFileSync(reviewPath, formatReview(quotes));
    console.log(`Wrote ${quotes.length} quotes to ${reviewPath}`);
    return;
  }

  if (command === "apply") {
    const before: Quote[] = JSON.parse(fs.readFileSync(QUOTES_JSON, "utf8"));
    const after = parseReview(fs.readFileSync(reviewPath, "utf8"));
    const key = (q: Quote) => q.content;
    const beforeKeys = new Set(before.map(key));
    const afterKeys = new Set(after.map(key));
    const added = after.filter((q) => !beforeKeys.has(key(q))).length;
    const removed = before.filter((q) => !afterKeys.has(key(q))).length;
    const tagged = after.filter((q) => q.tags.length > 0).length;
    fs.writeFileSync(QUOTES_JSON, `${JSON.stringify(after, undefined, 2)}\n`);
    console.log(
      `quotes.json: ${after.length} quotes (${added} new or edited text, ${removed} removed or edited), ${tagged} tagged`,
    );
    return;
  }

  console.error("Usage: tsx src/scripts/quotes/quoteReview.ts <export|apply> [review.md]");
  process.exit(1);
}

main();

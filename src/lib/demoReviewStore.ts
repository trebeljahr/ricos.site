// The demo review record: Notes/texts/demo-review.json. This repo is public, so
// it lives in private Notes with the other /dev state, which next.config.mjs
// keeps out of every deployed function. Server-only (node:fs).

import fs from "node:fs";
import path from "node:path";
import type { DemoReviews } from "./demoReview";
import { textsDir } from "./diaryStore";

export const REVIEW_FILE = "demo-review.json";

const reviewPath = () => path.join(textsDir(), REVIEW_FILE);

/**
 * Empty only when the file does not exist yet. A file that cannot be read
 * throws, because treating it as empty would let the next save erase it.
 */
export function readDemoReviews(): DemoReviews {
  let text: string;
  try {
    text = fs.readFileSync(reviewPath(), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  return JSON.parse(text) as DemoReviews;
}

/** Writes through a rename, so Obsidian Sync never picks up half a file. */
export function writeDemoReviews(reviews: DemoReviews): void {
  const file = reviewPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(reviews, undefined, 2)}\n`);
  fs.renameSync(temporary, file);
}

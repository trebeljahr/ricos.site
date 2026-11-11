// The demo review records: one file per series in Notes/texts, demo-review.json
// for the computer demos and piano-demo-review.json for the piano demos (see
// demoReviewSeries.ts). This repo is public, so they live in private Notes with
// the other /dev state, which next.config.mjs keeps out of every deployed
// function. Server-only (node:fs).

import fs from "node:fs";
import path from "node:path";
import { type DemoReviews, IMAGE_TYPES, isImageName } from "./demoReview";
import { REVIEW_SERIES, type ReviewSeries } from "./demoReviewSeries";
import { textsDir } from "./diaryStore";

const reviewPath = (series: ReviewSeries) => path.join(textsDir(), REVIEW_SERIES[series].file);

/**
 * Empty only when the file does not exist yet. A file that cannot be read
 * throws, because treating it as empty would let the next save erase it.
 */
export function readDemoReviews(series: ReviewSeries): DemoReviews {
  let text: string;
  try {
    text = fs.readFileSync(reviewPath(series), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  return JSON.parse(text) as DemoReviews;
}

/** Writes through a rename, so Obsidian Sync never picks up half a file. */
export function writeDemoReviews(series: ReviewSeries, reviews: DemoReviews): void {
  const file = reviewPath(series);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(reviews, undefined, 2)}\n`);
  fs.renameSync(temporary, file);
}

const imageDir = (series: ReviewSeries) => path.join(textsDir(), REVIEW_SERIES[series].imageDir);

/** The file a pasted screenshot is kept in, for scripts and agents reading the review. */
export const reviewImagePath = (series: ReviewSeries, name: string) =>
  path.join(imageDir(series), name);

export type ImageType = keyof typeof IMAGE_TYPES;

export const isImageType = (value: unknown): value is ImageType =>
  typeof value === "string" && value in IMAGE_TYPES;

/** Saves a pasted screenshot and returns its file name. */
export function saveReviewImage(
  series: ReviewSeries,
  slug: string,
  type: ImageType,
  data: Buffer,
  now = Date.now(),
): string {
  fs.mkdirSync(imageDir(series), { recursive: true });
  const extension = IMAGE_TYPES[type];
  let name = `${slug}-${now}.${extension}`;
  for (let copy = 1; fs.existsSync(reviewImagePath(series, name)); copy += 1) {
    name = `${slug}-${now}-${copy}.${extension}`;
  }
  fs.writeFileSync(reviewImagePath(series, name), data);
  return name;
}

/** A saved screenshot with its media type, or null for an unknown or missing name. */
export function readReviewImage(
  series: ReviewSeries,
  name: string,
): { type: string; data: Buffer } | null {
  if (!isImageName(name)) return null;
  const extension = name.split(".").pop();
  const type = Object.entries(IMAGE_TYPES).find(([, ext]) => ext === extension)?.[0];
  try {
    return {
      type: type ?? "application/octet-stream",
      data: fs.readFileSync(reviewImagePath(series, name)),
    };
  } catch {
    return null;
  }
}

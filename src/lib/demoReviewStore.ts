// The demo review record: Notes/texts/demo-review.json. This repo is public, so
// it lives in private Notes with the other /dev state, which next.config.mjs
// keeps out of every deployed function. Server-only (node:fs).

import fs from "node:fs";
import path from "node:path";
import { type DemoReviews, IMAGE_TYPES, isImageName, REVIEW_IMAGE_DIR } from "./demoReview";
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

const imageDir = () => path.join(textsDir(), REVIEW_IMAGE_DIR);

/** The file a pasted screenshot is kept in, for scripts and agents reading the review. */
export const reviewImagePath = (name: string) => path.join(imageDir(), name);

export type ImageType = keyof typeof IMAGE_TYPES;

export const isImageType = (value: unknown): value is ImageType =>
  typeof value === "string" && value in IMAGE_TYPES;

/** Saves a pasted screenshot and returns its file name. */
export function saveReviewImage(
  slug: string,
  type: ImageType,
  data: Buffer,
  now = Date.now(),
): string {
  fs.mkdirSync(imageDir(), { recursive: true });
  const extension = IMAGE_TYPES[type];
  let name = `${slug}-${now}.${extension}`;
  for (let copy = 1; fs.existsSync(reviewImagePath(name)); copy += 1) {
    name = `${slug}-${now}-${copy}.${extension}`;
  }
  fs.writeFileSync(reviewImagePath(name), data);
  return name;
}

/** A saved screenshot with its media type, or null for an unknown or missing name. */
export function readReviewImage(name: string): { type: string; data: Buffer } | null {
  if (!isImageName(name)) return null;
  const extension = name.split(".").pop();
  const type = Object.entries(IMAGE_TYPES).find(([, ext]) => ext === extension)?.[0];
  try {
    return {
      type: type ?? "application/octet-stream",
      data: fs.readFileSync(reviewImagePath(name)),
    };
  } catch {
    return null;
  }
}

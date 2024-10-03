import { readdir } from "fs/promises";
import path from "path";

export const newsletterPath = path.join(
  process.cwd(),
  "src",
  "content",
  "Notes",
  "newsletter-stuff",
  "newsletters"
);

const allNewsletterPaths = await readdir(newsletterPath);

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export const sortedNewsletterNames = allNewsletterPaths.sort(
  (a, b) => -collator.compare(a, b)
);

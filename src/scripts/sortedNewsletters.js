import { readdir } from "fs/promises";
import path from "path";

export const newsletterPath = path.join(
  process.cwd(),
  "src",
  "content",
  "Notes",
  "Newsletter Stuff",
  "newsletters"
);

const allNewsletterPaths = await readdir(newsletterPath);

console.log(allNewsletterPaths);

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export const sortedNewsletterNames = allNewsletterPaths.sort(
  (a, b) => -collator.compare(a, b)
);

import { readdir } from "node:fs/promises";
import path from "node:path";

export const newsletterPath = path.join(process.cwd(), "src", "content", "Notes", "newsletters");

const allNewsletterPaths = await readdir(newsletterPath);

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export const sortedNewsletterNames = allNewsletterPaths.sort((a, b) => -collator.compare(a, b));

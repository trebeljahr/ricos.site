import { readdir } from "fs/promises";
import path from "path";

const allNewsletters = await readdir(
  path.join(process.cwd(), "src", "content", "Notes", "newsletters")
);

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

export const sortedNewsletters = allNewsletters.sort(
  (a, b) => -collator.compare(a, b)
);

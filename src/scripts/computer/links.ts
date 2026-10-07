// pnpm computer:links — keeps the series clickable in Obsidian. For every
// chapter and aside in src/content/Notes/computer/ ("Part 1 - The Basics/
// 1.1 Bits and Encodings.md"), in `order`, it writes a "← prev · ↑ Index ·
// next →" line at the top and bottom, and it rewrites Index.md. Only the text
// between the nav comments changes. Rerun after adding, renaming, removing or
// reordering a chapter.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CHAPTER_FILE, indexNote, setNavLinks } from "src/lib/computerSeriesLinks";

const dir = process.argv[2] ?? path.join("src", "content", "Notes", "computer");

const files = fs
  .readdirSync(dir, { recursive: true, encoding: "utf8" })
  .map((f) => f.split(path.sep).join("/"))
  .filter((f) => CHAPTER_FILE.test(f))
  .map((f) => {
    const full = path.join(dir, f);
    const source = fs.readFileSync(full, "utf8");
    const { data } = matter(source);
    return {
      full,
      source,
      folder: path.dirname(f),
      stem: path.basename(f, ".md"),
      order: Number(data.order),
      parent: data.parent as string | undefined,
    };
  })
  .sort((a, b) => a.order - b.order);

const link = (f: (typeof files)[number] | undefined) => (f ? `[[${f.stem}]]` : undefined);

let changed = 0;
files.forEach((file, i) => {
  const next = setNavLinks(file.source, {
    prev: link(files[i - 1]),
    next: link(files[i + 1]),
    up: "[[Index]]",
  });
  if (next !== file.source) {
    fs.writeFileSync(file.full, next);
    changed += 1;
  }
});

fs.writeFileSync(path.join(dir, "Index.md"), indexNote(files));
console.log(`${files.length} files, ${changed} updated, Index.md written.`);

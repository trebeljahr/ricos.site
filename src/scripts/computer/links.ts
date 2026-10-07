// pnpm computer:links — writes a "← prev · ↑ index · next →" line at the top
// and bottom of every chapter and aside in src/content/Notes/computer/, in
// `order`, so the series can be clicked through in Obsidian. Only the text
// between the nav comments changes. Rerun after adding, removing or
// reordering a chapter.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { setNavLinks } from "src/lib/computerSeriesLinks";

const dir = process.argv[2] ?? path.join("src", "content", "Notes", "computer");

const files = fs
  .readdirSync(dir, { recursive: true, encoding: "utf8" })
  .filter((f) => /^part-[^/]+\/[^/]+\.md$/.test(f.split(path.sep).join("/")))
  .map((f) => {
    const full = path.join(dir, f);
    const source = fs.readFileSync(full, "utf8");
    const { data } = matter(source);
    return { full, source, stem: path.basename(f, ".md"), data };
  })
  .sort((a, b) => a.data.order - b.data.order);

const link = (f: (typeof files)[number] | undefined) =>
  f ? `[[${f.stem}|${f.data.number} ${f.data.title}]]` : undefined;

let changed = 0;
files.forEach((file, i) => {
  const next = setNavLinks(file.source, {
    prev: link(files[i - 1]),
    next: link(files[i + 1]),
    up: "[[index|Index]]",
  });
  if (next !== file.source) {
    fs.writeFileSync(file.full, next);
    changed += 1;
  }
});
console.log(`${files.length} files, ${changed} updated.`);

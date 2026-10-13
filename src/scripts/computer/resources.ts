// pnpm computer:resources — checks the study catalog in
// src/content/computer/resources.json against the chapter files and prints how
// much there is to study per part. A chapter without a list, a list for a slug
// no chapter has, an unknown or unused resource and a repeated address all fail
// the run.
//
//   pnpm computer:resources                  check and summarise
//   pnpm computer:resources --md <file.md>   also write the lists as Markdown
//   pnpm computer:resources --dir <folder>   read chapters from another folder
//
// With --md, an existing file keeps everything above the marker line and only
// the lists below it are rewritten, so a document can carry its own text on top.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CHAPTER_FILE } from "src/lib/computerSeriesLinks";
import {
  type Catalog,
  type ChapterRef,
  checkCatalog,
  formatMinutes,
  studyMarkdown,
  studyPlan,
} from "src/lib/computerSeriesResources";

const CATALOG_FILE = path.join("src", "content", "computer", "resources.json");
const LISTS_MARKER = "<!-- study lists: pnpm computer:resources --md rewrites everything below -->";

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const dir = option("--dir") ?? path.join("src", "content", "Notes", "computer");
const mdFile = option("--md");

const catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, "utf8")) as Catalog;

const chapters = fs
  .readdirSync(dir, { recursive: true, encoding: "utf8" })
  .map((f) => f.split(path.sep).join("/"))
  .filter((f) => CHAPTER_FILE.test(f))
  .map((f) => {
    const { data } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
    return {
      number: String(data.number),
      title: String(data.title),
      slug: data.slug as string | undefined,
      partTitle: path.dirname(f),
      order: Number(data.order),
    } satisfies ChapterRef & { order: number };
  })
  .sort((a, b) => a.order - b.order);

if (chapters.length === 0) {
  console.error(`No chapter files in ${dir}.`);
  process.exit(1);
}

const problems = checkCatalog(
  catalog,
  chapters.flatMap((c) => (c.slug ? [c.slug] : [])),
);
for (const chapter of chapters) {
  if (!chapter.slug) problems.push(`chapter ${chapter.number}: no slug in its frontmatter`);
}

const parts = [...new Set(chapters.map((c) => c.partTitle))];
for (const part of parts) {
  const plans = chapters.filter((c) => c.partTitle === part).map((c) => studyPlan(c.slug, catalog));
  const core = plans.flatMap((p) => p?.core ?? []);
  const minutes = new Map(core.map((item) => [item.id, item.minutes ?? 0]));
  const total = [...minutes.values()].reduce((sum, m) => sum + m, 0);
  console.log(
    `${part}: ${plans.filter(Boolean).length} lists, ${minutes.size} core items, ${formatMinutes(total)} of core video`,
  );
}
console.log(
  `${Object.keys(catalog.resources).length} resources for ${chapters.length} chapters and asides.`,
);

if (mdFile) {
  const lists = studyMarkdown(chapters, catalog);
  const before = fs.existsSync(mdFile) ? fs.readFileSync(mdFile, "utf8") : "";
  const at = before.indexOf(LISTS_MARKER);
  const head = at === -1 ? before.trimEnd() : before.slice(0, at).trimEnd();
  fs.writeFileSync(mdFile, `${head ? `${head}\n\n` : ""}${LISTS_MARKER}\n\n${lists}`);
  console.log(`Lists written to ${mdFile}.`);
}

if (problems.length > 0) {
  console.error(`\n${problems.length} problems:\n${problems.map((p) => `  ${p}`).join("\n")}`);
  process.exit(1);
}

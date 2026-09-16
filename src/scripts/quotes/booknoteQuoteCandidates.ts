// Collects blockquotes from published booknotes that are not yet in quotes.json.
// Booknotes stay untouched: good ones get copied into the quotes review file
// by hand (see quoteReview.ts), which is a second round of curation.
//
//   pnpm quotes:candidates [out.md] [--json out.json]
//
// Run from the main checkout.

import fs from "node:fs";
import path from "node:path";
import slugify from "@sindresorhus/slugify";
import matter from "gray-matter";
import { formatQuote, QUOTES_JSON, type Quote, REVIEW_DIR } from "./quoteReviewFormat";

const BOOKNOTES_DIR = "src/content/Notes/booknotes";
const MIN_LENGTH = 25;
const MAX_LENGTH = 600;

export type Candidate = Quote & {
  /** The paragraph right before the quote, to judge whether it stands on its own. */
  context: string;
};

// Cards render plain text, so drop inline Markdown: links, emphasis, footnote refs.
const stripMarkdown = (text: string) =>
  text
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(\*|_)(\S(?:.*?\S)?)\1/g, "$2");

const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "");

function blockquotes(markdown: string) {
  const found: { content: string; context: string }[] = [];
  let lastParagraph = "";
  let current: string[] | null = null;

  const flush = () => {
    if (!current) return;
    found.push({ content: stripMarkdown(current.join("\n").trim()), context: lastParagraph });
    current = null;
  };

  for (const line of markdown.split("\n")) {
    if (line.startsWith(">")) {
      current ??= [];
      current.push(line.replace(/^> ?/, ""));
      continue;
    }
    flush();
    if (line.trim() && !line.startsWith("#")) lastParagraph = line.trim().slice(0, 300);
  }
  flush();
  return found;
}

function collect(): Candidate[] {
  const existing = new Set(
    (JSON.parse(fs.readFileSync(QUOTES_JSON, "utf8")) as Quote[]).map((q) => normalize(q.content)),
  );
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  for (const file of fs
    .readdirSync(BOOKNOTES_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()) {
    const { data, content } = matter(fs.readFileSync(path.join(BOOKNOTES_DIR, file), "utf8"));
    // Only books with a public page, so the card's source link resolves.
    if (!data.published || !data.summary) continue;

    for (const quote of blockquotes(content)) {
      const key = normalize(quote.content);
      const looksLikeProse = !/^(!\[|\||- |\* |\d+\. )/.test(quote.content);
      if (
        quote.content.length < MIN_LENGTH ||
        quote.content.length > MAX_LENGTH ||
        !looksLikeProse ||
        existing.has(key) ||
        seen.has(key)
      ) {
        continue;
      }
      seen.add(key);
      candidates.push({
        author: data.bookAuthor,
        content: quote.content,
        tags: [],
        source: { title: data.title, url: `/booknotes/${slugify(path.parse(file).name)}` },
        context: quote.context,
      });
    }
  }
  return candidates;
}

function main() {
  const args = process.argv.slice(2);
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? args.splice(jsonIndex, 2)[1] : undefined;
  const outPath = args[0] ?? path.join(REVIEW_DIR, "booknote-quote-candidates.md");

  const candidates = collect();
  if (jsonPath) fs.writeFileSync(jsonPath, JSON.stringify(candidates, undefined, 2));

  const intro = `# Booknote quote candidates

Blockquotes from published booknotes that are not in quotes.json yet (${candidates.length}).
Cut the sections you want, paste them into quotes-review.md, add tags, then run \`pnpm quotes:apply\`.

`;
  fs.writeFileSync(
    outPath,
    intro + candidates.map((c, i) => `${formatQuote(c, i + 1)}\n`).join("\n"),
  );
  console.log(`Wrote ${candidates.length} candidates to ${outPath}`);
}

main();

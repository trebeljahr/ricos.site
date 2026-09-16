// Markdown format for curating quotes.json in Obsidian. See quoteReview.ts.

import path from "node:path";

export type QuoteSource = { title: string; url: string };

export type Quote = {
  author: string;
  content: string;
  tags: string[];
  source?: QuoteSource;
};

export const QUOTES_JSON = "src/content/Notes/pages/quotes.json";
export const REVIEW_DIR =
  "src/content/Notes/texts/misc/claude-chat-gpt-generated/projects/ricos.site";
export const DEFAULT_REVIEW = path.join(REVIEW_DIR, "quotes-review.md");

const HEADER = `# Quotes review

Edit authors, quote text and tags here, then run \`pnpm quotes:apply\` in the ricos.site repo.
Delete a section to drop a quote. Sections apply in file order.

`;

export function formatQuote(quote: Quote, number: number) {
  const lines = [`### ${String(number).padStart(3, "0")} · ${quote.author}`];
  for (const line of quote.content.split("\n")) lines.push(line ? `> ${line}` : ">");
  lines.push("", `tags: ${quote.tags.join(", ")}`);
  if (quote.source) lines.push(`source: [${quote.source.title}](${quote.source.url})`);
  return lines.join("\n");
}

export function formatReview(quotes: Quote[], preamble = "") {
  return `${HEADER}${preamble}## Quotes\n\n${quotes.map((quote, i) => `${formatQuote(quote, i + 1)}\n`).join("\n")}`;
}

export function parseReview(markdown: string): Quote[] {
  const sections = markdown.split(/^### /m).slice(1);
  return sections.map((section, index) => {
    const [heading, ...body] = section.split("\n");
    const author = heading.replace(/^\d+\s*·\s*/, "").trim();
    const content = body
      .filter((line) => line.startsWith(">"))
      .map((line) => line.replace(/^> ?/, ""))
      .join("\n")
      .trim();
    const tagLine = body.find((line) => line.startsWith("tags:")) ?? "tags:";
    const tags = tagLine
      .slice("tags:".length)
      .split(/[,\s]+/)
      .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
      .filter(Boolean);
    const sourceMatch = body.find((line) => line.startsWith("source:"))?.match(/\[(.+)\]\((.+)\)/);

    if (!author || !content) {
      throw new Error(`Section ${index + 1} ("${heading}") needs both an author and a quote.`);
    }
    return {
      author,
      content,
      tags: [...new Set(tags)],
      ...(sourceMatch && { source: { title: sourceMatch[1], url: sourceMatch[2] } }),
    };
  });
}

/**
 * Plain-text excerpts for listing cards, meta descriptions, RSS and search.
 *
 * Excerpts are cut on sentence boundaries when possible, otherwise on a word
 * boundary with a single "…" appended. Visual truncation on cards is left to
 * CSS `line-clamp`, so these strings only need to read well, not fit a box.
 */

const TERMINAL_PUNCTUATION = /[.!?…:"”’')\]]$/;

// Words a cut should never end on: "…the problem with" reads as broken.
const DANGLING_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "because",
  "but",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "of",
  "on",
  "or",
  "so",
  "that",
  "the",
  "to",
  "was",
  "which",
  "with",
]);

function stripInline(text: string): string {
  return (
    text
      // Images and Obsidian embeds.
      .replace(/!\[\[[^\]]*\]\]/g, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      // Wikilinks [[target|alias]] → alias, [[target]] → target.
      .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
      .replace(/\[\[([^\]]*)\]\]/g, "$1")
      // Footnote references [^1].
      .replace(/\[\^[^\]]*\]/g, "")
      // Links [text](url) and [text][ref] → text.
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
      // Autolinks <https://…> → url, then any remaining HTML/JSX tag.
      .replace(/<(https?:\/\/[^>\s]+)>/g, "$1")
      .replace(/<\/?[A-Za-z][^>]*>/g, "")
      // Bare URLs read as noise in a teaser.
      .replace(/\bhttps?:\/\/\S+/g, "")
      // JSX expressions and MDX comments.
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\{[^{}]*\}/g, "")
      // Math: $$…$$ and $…$, without eating prices like "$5 and $10".
      .replace(/\$\$[^$]*\$\$/g, "")
      .replace(/\$(?=\S)[^$\n]*?\S\$(?!\d)/g, "")
      // Inline code keeps its text.
      .replace(/`([^`]*)`/g, "$1")
      // Emphasis and strikethrough keep their text.
      .replace(/(\*\*|__)(\S(?:.*?\S)?)\1/g, "$2")
      .replace(/\*(\S(?:.*?\S)?)\*/g, "$1")
      .replace(/(^|[^\w])_(\S(?:.*?\S)?)_(?!\w)/g, "$1$2")
      .replace(/~~(.+?)~~/g, "$1")
      // Backslash escapes.
      .replace(/\\([\\`*_{}[\]()#+\-.!<>|~$])/g, "$1")
      // Common entities.
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
  );
}

function isSkippedLine(line: string): boolean {
  return (
    /^#{1,6}(\s|$)/.test(line) || // headings
    /^(import|export)\s/.test(line) || // MDX module lines
    /^\|/.test(line) || // table rows
    /^([-*_])(\s*\1){2,}$/.test(line) || // horizontal rules
    /^\[\^[^\]]+\]:/.test(line) || // footnote definitions
    /^\[[^\]]+\]:\s/.test(line) || // link reference definitions
    /^>\s*\[![^\]]+\]/.test(line) || // callout headers
    /^<\/?[A-Za-z][^>]*>$/.test(line) // lines that are only a tag
  );
}

/** Markdown/MDX → plain-text paragraphs, with block and inline syntax removed. */
export function markdownToParagraphs(markdown: string): string[] {
  const withoutBlocks = markdown
    .replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, "")
    .replace(/^\$\$[\s\S]*?^\$\$\s*$/gm, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  const paragraphs: string[] = [];
  let current: string[] = [];
  const flush = () => {
    const paragraph = normalizeWhitespace(stripInline(current.join(" ")));
    if (paragraph) paragraphs.push(paragraph);
    current = [];
  };

  for (const rawLine of withoutBlocks.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    if (isSkippedLine(line)) {
      flush();
      continue;
    }
    const content = line
      .replace(/^(>\s?)+/, "")
      .replace(/^([-*+]|\d+[.)])\s+/, "")
      .replace(/^\[[ xX]\]\s+/, "")
      .trim();
    if (content) current.push(content);
  }
  flush();

  return paragraphs;
}

function normalizeWhitespace(text: string): string {
  return (
    text
      .replace(/\.{3}/g, "…")
      .replace(/\s+/g, " ")
      // "first principles.Rework" → "first principles. Rework"
      .replace(/([a-z]{2}[.!?])([A-Z][a-z])/g, "$1 $2")
      .replace(/\(\s*\)/g, "")
      .replace(/\s+([.,;:!?…)])/g, "$1")
      .replace(/\(\s+/g, "(")
      .trim()
  );
}

/** Short lines without closing punctuation at the top of a post are titles, not prose. */
function isHeadingLike(paragraph: string): boolean {
  return paragraph.length <= 80 && !TERMINAL_PUNCTUATION.test(paragraph);
}

function splitSentences(text: string): string[] {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  const sentences: string[] = [];
  for (const { segment } of segmenter.segment(text)) {
    const previous = sentences.length - 1;
    // ICU breaks after "?" in "should?) be" and after abbreviations like
    // "e.g. Foo". A segment starting lowercase continues the previous one.
    if (previous >= 0 && /^[\s)\]"”’]*[a-z]/.test(segment)) {
      sentences[previous] += segment;
    } else {
      sentences.push(segment);
    }
  }
  return sentences;
}

/** Cut `text` to at most `maxLength` characters (including the "…") on a word boundary. */
export function truncateAtWord(text: string, maxLength: number): string {
  const clean = text.trim();
  if (clean.length <= maxLength) return clean;

  let cut = clean.slice(0, maxLength);
  const nextChar = clean[maxLength];
  if (nextChar && !/\s/.test(nextChar)) {
    const lastSpace = cut.lastIndexOf(" ");
    if (lastSpace > 0) cut = cut.slice(0, lastSpace);
  }

  // Leave room for the ellipsis.
  while (cut.length > maxLength - 1) {
    const lastSpace = cut.lastIndexOf(" ");
    if (lastSpace <= 0) {
      cut = cut.slice(0, maxLength - 1);
      break;
    }
    cut = cut.slice(0, lastSpace);
  }

  // Drop an unclosed parenthetical rather than end inside it.
  const open = cut.lastIndexOf("(");
  if (open > 0 && cut.indexOf(")", open) === -1) cut = cut.slice(0, open);

  for (let i = 0; i < 5; i++) {
    const before = cut;
    cut = cut.replace(/[\s,;:\-–—/&(["“‘'.…]+$/, "");
    const lastWord = cut.slice(cut.lastIndexOf(" ") + 1);
    if (cut.includes(" ") && DANGLING_WORDS.has(lastWord.toLowerCase())) {
      cut = cut.slice(0, cut.lastIndexOf(" "));
    }
    if (cut === before) break;
  }

  return `${cut}…`;
}

/**
 * Build an excerpt of at most `maxLength` characters from Markdown/MDX.
 * Whole sentences are preferred; a single overlong opening sentence (or a
 * uselessly short run of sentences) falls back to a word-boundary cut.
 */
export function generateExcerpt(markdown: string, maxLength: number): string {
  const paragraphs = markdownToParagraphs(markdown);
  while (paragraphs.length > 1 && isHeadingLike(paragraphs[0])) paragraphs.shift();

  const text = paragraphs.join(" ");
  if (!text) return "";
  if (text.length <= maxLength) return text;

  let excerpt = "";
  for (const sentence of splitSentences(text)) {
    if ((excerpt + sentence).trimEnd().length > maxLength) break;
    excerpt += sentence;
  }
  excerpt = excerpt.trim();

  if (excerpt.length >= maxLength * 0.4) return excerpt;
  return truncateAtWord(text, maxLength);
}

/** Escape plain text so MDX renders it literally instead of parsing it as syntax. */
export function escapeMdx(text: string): string {
  return text.replace(/[\\`*_{}[\]<>#|~]/g, "\\$&");
}

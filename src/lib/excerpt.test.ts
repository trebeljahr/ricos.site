import { describe, expect, it } from "vitest";
import { escapeMdx, generateExcerpt, markdownToParagraphs, truncateAtWord } from "./excerpt";

describe("markdownToParagraphs", () => {
  it("strips block and inline markdown", () => {
    const markdown = [
      "import { Demo } from './demo'",
      "",
      "# Heading",
      "",
      "> A **bold** quote with a [link](/somewhere) and `code`.",
      "",
      "![cover](/img.jpg)",
      "",
      "- *first* item[^1]",
      "- [[Wiki Page|second]] item",
      "",
      "```ts",
      "const x = 1;",
      "```",
      "",
      "<Demo prop={1} />",
      "",
      "Energy is $E = mc^2$ and costs $5 to $10.",
    ].join("\n");

    expect(markdownToParagraphs(markdown)).toEqual([
      "A bold quote with a link and code.",
      "first item second item",
      "Energy is and costs $5 to $10.",
    ]);
  });

  it("keeps snake_case words intact and normalizes ellipses", () => {
    expect(markdownToParagraphs("Use my_var_name... _really_.")).toEqual([
      "Use my_var_name… really.",
    ]);
  });
});

describe("truncateAtWord", () => {
  it("cuts on a word boundary with a single ellipsis character", () => {
    const result = truncateAtWord("The quick brown fox jumps over the lazy dog", 24);
    expect(result).toBe("The quick brown fox…");
    expect(result.length).toBeLessThanOrEqual(24);
  });

  it("drops trailing punctuation and dangling words before the ellipsis", () => {
    expect(truncateAtWord("Apples, pears, and the oranges are fruit", 22)).toBe("Apples, pears…");
  });

  it("does not end inside an unclosed parenthesis", () => {
    expect(truncateAtWord("A book about business (and maybe life) today", 30)).toBe(
      "A book about business…",
    );
  });
});

describe("generateExcerpt", () => {
  it("returns short text unchanged", () => {
    expect(generateExcerpt("Just one sentence.", 280)).toBe("Just one sentence.");
  });

  it("keeps whole sentences instead of cutting at commas", () => {
    const text =
      "In this tutorial, we build a shader editor. We use codemirror, a few other tools, and patience. Along the way, we learn a lot about GLSL.";
    expect(generateExcerpt(text, 100)).toBe(
      "In this tutorial, we build a shader editor. We use codemirror, a few other tools, and patience.",
    );
  });

  it("does not split on abbreviations or mid-sentence question marks", () => {
    const text =
      "Business can (and maybe should?) be fun, i.e. playful. Second sentence here that is long enough to overflow the limit.";
    expect(generateExcerpt(text, 70)).toBe(
      "Business can (and maybe should?) be fun, i.e. playful.",
    );
  });

  it("skips a leading title-like line", () => {
    expect(generateExcerpt("Blog Questions Challenge\n\nWhy did you start?", 280)).toBe(
      "Why did you start?",
    );
  });

  it("falls back to a word cut when the first sentence is too long", () => {
    const text = `${"word ".repeat(80)}end.`;
    const result = generateExcerpt(text, 100);
    expect(result.endsWith("word…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it("avoids a uselessly short fragment", () => {
    const text = `Hi. ${"This sentence keeps going and going ".repeat(10)}.`;
    const result = generateExcerpt(text, 120);
    expect(result.startsWith("Hi. This sentence")).toBe(true);
    expect(result.endsWith("…")).toBe(true);
  });

  it("returns an empty string for empty content", () => {
    expect(generateExcerpt("# Only a heading\n\n![img](/a.jpg)", 280)).toBe("");
  });
});

describe("escapeMdx", () => {
  it("escapes characters MDX would parse", () => {
    expect(escapeMdx("a < b {c} *d*")).toBe("a \\< b \\{c\\} \\*d\\*");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildIndex,
  type NoteFile,
  passagesOf,
  related,
  search,
  sourceOf,
  termPattern,
  tokenize,
} from "./notesSearch";

const filler = (n: number, word = "filler") => Array.from({ length: n }, () => word).join(" ");

const files: NoteFile[] = [
  {
    rel: "texts/diary-entries/2019-05-01-a.md",
    title: undefined,
    content: `I felt envy watching her play the cello.\n\nThe weather was fine and ${filler(10)}.`,
  },
  {
    rel: "texts/essays/on-envy.md",
    title: "On envy",
    content: `## Why it stings\n\nEnvy points at what you want. A cello player taught me that, ${filler(10, "again")}.`,
  },
  {
    rel: "texts/morning-pages/2024-02-02.md",
    title: undefined,
    content: "Dreaming about the sea again. The cello can wait until the sea is calm today.",
  },
  { rel: "booknotes/some-book.md", title: "Some Book", content: "Taxes and spreadsheets all day." },
];

const index = buildIndex(files.flatMap(passagesOf));

describe("passagesOf", () => {
  it("cuts a long paragraph at sentence ends and keeps every word, in order", () => {
    const sentence = "Word ".repeat(20).trim();
    const text = Array.from({ length: 30 }, () => `${sentence}.`).join(" ");
    const passages = passagesOf({ rel: "texts/essays/x.md", title: "X", content: text });
    expect(passages.length).toBeGreaterThan(2);
    expect(passages.map((p) => p.text).join(" ")).toBe(text);
  });

  it("names the source, date and section", () => {
    const [passage] = passagesOf(files[1]);
    expect(passage.source).toBe("Essays");
    expect(passage.heading).toBe("## Why it stings");
    expect(passagesOf(files[0])[0].date).toBe("2019-05-01");
  });

  it("sorts folders into sources", () => {
    expect(sourceOf("texts/diary-entries/a.md")).toBe("Diary");
    expect(sourceOf("booknotes/a.md")).toBe("Booknotes");
    expect(sourceOf("texts/unknown/a.md")).toBe("texts");
  });
});

describe("tokenize", () => {
  it("drops stop words and URLs and folds word endings", () => {
    expect(tokenize("The dreams of [a link](https://x.co/y) dreaming")).toEqual([
      "dream",
      "link",
      "dream",
    ]);
  });
});

describe("search", () => {
  it("finds a word in every file that has it, whatever its form", () => {
    const rels = search(index, "dreams").passages.map((p) => p.rel);
    expect(rels).toEqual(["texts/morning-pages/2024-02-02.md"]);
    const cello = search(index, "cello");
    expect(cello.total).toBe(3);
  });

  it("filters by source and sorts oldest first, undated last", () => {
    expect(search(index, "cello", { source: "Essays" }).passages).toHaveLength(1);
    const dates = search(index, "cello", { sort: "date" }).passages.map((p) => p.date);
    expect(dates).toEqual(["2019-05-01", "2024-02-02", null]);
  });

  it("requires quoted words in that order", () => {
    expect(search(index, '"cello player"').passages.map((p) => p.source)).toEqual(["Essays"]);
    expect(search(index, '"player cello"').passages).toEqual([]);
  });

  it("finds nothing for stop words alone", () => {
    expect(search(index, "the of and").total).toBe(0);
  });
});

describe("related", () => {
  it("finds passages elsewhere that share rare words, never the same file", () => {
    const found = related(index, "envy and the cello", "texts/diary-entries/2019-05-01-a.md");
    expect(found.map((p) => p.rel)).toContain("texts/essays/on-envy.md");
    expect(found.every((p) => p.rel !== "texts/diary-entries/2019-05-01-a.md")).toBe(true);
    expect(found.map((p) => p.rel)).not.toContain("booknotes/some-book.md");
  });
});

describe("termPattern", () => {
  it("matches a word's other forms, and is null without real words", () => {
    const pattern = termPattern("dreams") as RegExp;
    expect("Dreaming of dream".match(pattern)).toEqual(["Dreaming", "dream"]);
    expect(termPattern("the")).toBeNull();
  });
});

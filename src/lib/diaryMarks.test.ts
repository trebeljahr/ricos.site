import { describe, expect, it } from "vitest";
import {
  addMark,
  EMPTY_BOOK,
  fileMark,
  locateQuote,
  markId,
  moveMark,
  pileDraft,
  removeMark,
  slugify,
  unfileMark,
} from "./diaryMarks";

const mark = (quote: string, rel = "texts/diary-entries/2019-01-01-a.md") => ({
  quote,
  rel,
  title: "A",
  date: "2019-01-01",
  day: "2026-11-03",
});

const book = ["one", "two", "three"].reduce((b, q) => addMark(b, mark(q)), EMPTY_BOOK);
const [one, two, three] = book.marks.map((m) => m.id);

describe("marks", () => {
  it("keeps one mark for the same words in the same file", () => {
    expect(addMark(book, mark("one"))).toBe(book);
    expect(addMark(book, mark("one", "texts/other.md")).marks).toHaveLength(4);
    expect(markId("r", "a  b\nc")).toBe(markId("r", "a b c"));
  });

  it("removes a mark from its piles too", () => {
    const filed = fileMark(book, one, "Envy");
    expect(removeMark(filed, one).piles[0].ids).toEqual([]);
  });
});

describe("piles", () => {
  const pile = [one, two, three].reduce((b, id) => fileMark(b, id, "Envy"), book);

  it("lets a mark sit in several piles, once each", () => {
    const both = fileMark(pile, one, "Music");
    expect(both.piles.map((p) => p.name)).toEqual(["Envy", "Music"]);
    expect(fileMark(pile, one, "Envy")).toBe(pile);
    expect(fileMark(pile, "nope", "Other")).toBe(pile);
    expect(fileMark(pile, one, "   ")).toBe(pile);
  });

  it("moves within bounds", () => {
    expect(moveMark(pile, three, "Envy", -1).piles[0].ids).toEqual([one, three, two]);
    expect(moveMark(pile, one, "Envy", -1).piles[0].ids).toEqual([one, two, three]);
    expect(moveMark(pile, three, "Envy", 1).piles[0].ids).toEqual([one, two, three]);
  });

  it("drops a pile once it is empty, but keeps the marks", () => {
    const small = fileMark(book, one, "Solo");
    const out = unfileMark(small, one, "Solo");
    expect(out.piles).toEqual([]);
    expect(out.marks).toHaveLength(3);
  });

  it("writes a draft word for word, in pile order, with links back", () => {
    const moved = moveMark(pile, two, "Envy", -1);
    const draft = pileDraft(moved, "Envy");
    expect(draft.startsWith("# Envy\n\n> two\n\n[[2019-01-01-a]] (2019-01-01)")).toBe(true);
    expect(draft.indexOf("> two")).toBeLessThan(draft.indexOf("> one"));
    const lines = addMark(book, mark("first\n\nsecond"));
    const id = lines.marks[3].id;
    expect(pileDraft(fileMark(lines, id, "P"), "P")).toContain("> first\n>\n> second");
  });

  it("makes file names from pile names", () => {
    expect(slugify("Envy & Über-Things!")).toBe("envy-über-things");
    expect(slugify("!!!")).toBe("pile");
  });
});

describe("locateQuote", () => {
  it("ignores whitespace, including across paragraphs", () => {
    const text = "The end.Next  paragraph here.";
    const span = locateQuote(text, "end.\n\nNext paragraph");
    expect(span && text.slice(...span)).toBe("end.Next  paragraph");
  });

  it("finds nothing for missing or empty quotes", () => {
    expect(locateQuote("abc", "xyz")).toBeNull();
    expect(locateQuote("abc", "  ")).toBeNull();
  });
});

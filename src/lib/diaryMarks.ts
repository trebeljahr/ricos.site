// Passages Rico marks while reading, and the piles he sorts them into to write
// from. A mark quotes the text word for word and points back at its file; piles
// hold mark ids in reading order, and a mark can sit in several. Pure functions;
// notesStore.ts keeps the book in private Notes.

import { fnv1a } from "./diary";

export type Mark = {
  id: string;
  quote: string;
  /** Path under Notes/. */
  rel: string;
  title: string;
  date: string | null;
  /** The day it was marked. */
  day: string;
};

export type Pile = { name: string; ids: string[] };
export type MarkBook = { marks: Mark[]; piles: Pile[] };

export const EMPTY_BOOK: MarkBook = { marks: [], piles: [] };

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

export const markId = (rel: string, quote: string) =>
  fnv1a(`${rel}|${collapse(quote)}`)
    .toString(16)
    .padStart(8, "0");

/** Marking the same words in the same file twice keeps one mark. */
export function addMark(book: MarkBook, mark: Omit<Mark, "id">): MarkBook {
  const id = markId(mark.rel, mark.quote);
  if (book.marks.some((m) => m.id === id)) return book;
  return { ...book, marks: [...book.marks, { ...mark, id }] };
}

export function removeMark(book: MarkBook, id: string): MarkBook {
  return {
    marks: book.marks.filter((m) => m.id !== id),
    piles: book.piles.map((p) => ({ ...p, ids: p.ids.filter((i) => i !== id) })),
  };
}

/** Adds a mark to the end of a pile, starting the pile if it is new. */
export function fileMark(book: MarkBook, id: string, pile: string): MarkBook {
  const name = collapse(pile);
  if (!name || !book.marks.some((m) => m.id === id)) return book;
  const existing = book.piles.find((p) => p.name === name);
  if (existing?.ids.includes(id)) return book;
  return {
    ...book,
    piles: existing
      ? book.piles.map((p) => (p === existing ? { ...p, ids: [...p.ids, id] } : p))
      : [...book.piles, { name, ids: [id] }],
  };
}

/** Takes a mark out of a pile; a pile with nothing left goes too. */
export function unfileMark(book: MarkBook, id: string, pile: string): MarkBook {
  return {
    ...book,
    piles: book.piles
      .map((p) => (p.name === pile ? { ...p, ids: p.ids.filter((i) => i !== id) } : p))
      .filter((p) => p.ids.length > 0),
  };
}

/** Moves a mark earlier (by < 0) or later (by > 0) in its pile. */
export function moveMark(book: MarkBook, id: string, pile: string, by: number): MarkBook {
  return {
    ...book,
    piles: book.piles.map((p) => {
      const from = p.ids.indexOf(id);
      if (p.name !== pile || from < 0) return p;
      const to = Math.min(Math.max(from + by, 0), p.ids.length - 1);
      const ids = p.ids.filter((i) => i !== id);
      ids.splice(to, 0, id);
      return { ...p, ids };
    }),
  };
}

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "") || "pile";

const stem = (rel: string) => (rel.split("/").pop() ?? rel).replace(/\.mdx?$/, "");

/** A pile as a Markdown file to write from: every quote word for word, linked to its source. */
export function pileDraft(book: MarkBook, pile: string): string {
  const ids = book.piles.find((p) => p.name === pile)?.ids ?? [];
  const passages = ids.flatMap((id) => {
    const mark = book.marks.find((m) => m.id === id);
    if (!mark) return [];
    const quote = mark.quote
      .split("\n")
      .map((line) => (line.trim() ? `> ${line}` : ">"))
      .join("\n");
    const date = mark.date ? ` (${mark.date})` : "";
    return [`${quote}\n\n[[${stem(mark.rel)}]]${date}`];
  });
  return `# ${pile}\n\n${passages.join("\n\n")}\n`;
}

/**
 * Where a quote sits in a text, as [start, end) offsets. Whitespace does not
 * count: a selection across two paragraphs has line breaks the rendered text
 * nodes do not have, and the other way round.
 */
export function locateQuote(text: string, quote: string): [number, number] | null {
  const needle = quote.replace(/\s+/g, "");
  if (!needle) return null;
  const offsets: number[] = [];
  let squeezed = "";
  for (let i = 0; i < text.length; i++) {
    if (/\s/.test(text[i])) continue;
    offsets.push(i);
    squeezed += text[i];
  }
  const at = squeezed.indexOf(needle);
  if (at < 0) return null;
  return [offsets[at], offsets[at + needle.length - 1] + 1];
}

/**
 * Dev-only endpoint behind marking on /dev/diary: adds and removes marks, sorts
 * them into piles and writes a pile out as a draft. Everything stays in private
 * Notes (see notesStore.ts). 404s in production and for any other machine.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { dayKey } from "src/lib/computerSeries";
import {
  addMark,
  fileMark,
  type MarkBook,
  moveMark,
  removeMark,
  unfileMark,
} from "src/lib/diaryMarks";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";
import { readMarks, writeDraft, writeMarks } from "src/lib/notesStore";

type Body = {
  action?: unknown;
  id?: unknown;
  pile?: unknown;
  by?: unknown;
  quote?: unknown;
  rel?: unknown;
  title?: unknown;
  date?: unknown;
};

const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;

function apply(book: MarkBook, body: Body): MarkBook | null {
  const { action, id, pile, by, quote, rel, title, date } = body;
  if (action === "add" && isText(quote) && isText(rel) && isText(title)) {
    return addMark(book, {
      quote: quote.trim(),
      rel,
      title,
      date: isText(date) ? date : null,
      day: dayKey(new Date()),
    });
  }
  if (!isText(id)) return null;
  if (action === "remove") return removeMark(book, id);
  if (!isText(pile)) return null;
  if (action === "file") return fileMark(book, id, pile);
  if (action === "unfile") return unfileMark(book, id, pile);
  if (action === "move" && typeof by === "number") return moveMark(book, id, pile, by);
  return null;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ error: "Not available" });
    return;
  }
  if (!servesPrivateNotes(process.env, clientAddresses(req))) {
    res.status(404).json({ error: "Not available" });
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body = (req.body ?? {}) as Body;
  const book = readMarks();
  try {
    if (body.action === "draft" && isText(body.pile)) {
      res.status(200).json({ book, path: writeDraft(book, body.pile) });
      return;
    }
    const next = apply(book, body);
    if (!next) {
      res.status(400).json({ error: "Unknown action or missing fields" });
      return;
    }
    if (next !== book) writeMarks(next);
    res.status(200).json({ book: next });
  } catch (error) {
    res.status(500).json({ error: `Could not save: ${String(error)}` });
  }
}

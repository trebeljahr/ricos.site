/**
 * Dev-only search over private Notes: { q, source, sort } finds passages,
 * { like, rel } finds passages elsewhere that are close to a text. Both use words
 * and, while the local model answers, meaning (see notesVectors.ts). POST, so
 * private words stay out of URLs and server logs. 404s in production and for any
 * other machine.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";
import { type NotesIndex, nearest, related, search } from "src/lib/notesSearch";
import { notesIndex } from "src/lib/notesStore";
import { embedQuery, vectorStore } from "src/lib/notesVectors";

const NEAR_LIMIT = 150;

/** Nearest passages by meaning, and how far that search reaches right now. */
async function byMeaning(index: NotesIndex, text: string) {
  const store = vectorStore(index);
  const covered = store.slots.some((slot) => slot >= 0);
  const query = covered ? await embedQuery(text) : null;
  return {
    near: query ? nearest(store, query, NEAR_LIMIT) : undefined,
    meaning: { on: query !== null, missing: store.missing },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
  const { q, source, sort, like, rel } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof like !== "string" && typeof q !== "string") {
    res.status(400).json({ error: "Send { q } or { like, rel }" });
    return;
  }
  const index = notesIndex();
  if (typeof like === "string") {
    const { near, meaning } = await byMeaning(index, like);
    const passages = related(index, like, typeof rel === "string" ? rel : "", 8, near);
    res.status(200).json({ passages, total: passages.length, meaning });
    return;
  }
  const query = q as string;
  const { near, meaning } = await byMeaning(index, query.replace(/"/g, ""));
  res.status(200).json({
    ...search(index, query, {
      source: typeof source === "string" && source ? source : undefined,
      sort: sort === "date" ? "date" : "rank",
      near,
    }),
    meaning,
  });
}

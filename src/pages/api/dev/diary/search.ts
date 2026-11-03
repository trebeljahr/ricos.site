/**
 * Dev-only search over private Notes: { q, source, sort } finds passages,
 * { like, rel } finds passages elsewhere that share a text's rarest words. POST,
 * so private words stay out of URLs and server logs. 404s in production and for
 * any other machine.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";
import { related, search } from "src/lib/notesSearch";
import { notesIndex } from "src/lib/notesStore";

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
  const { q, source, sort, like, rel } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof like === "string") {
    const passages = related(notesIndex(), like, typeof rel === "string" ? rel : "");
    res.status(200).json({ passages, total: passages.length });
    return;
  }
  if (typeof q !== "string") {
    res.status(400).json({ error: "Send { q } or { like, rel }" });
    return;
  }
  res.status(200).json(
    search(notesIndex(), q, {
      source: typeof source === "string" && source ? source : undefined,
      sort: sort === "date" ? "date" : "rank",
    }),
  );
}

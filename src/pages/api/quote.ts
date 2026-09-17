import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";
import { cleanAuthor } from "src/lib/quotePortraits";

/** Short enough to read in a speech bubble on a phone. */
const MAX_LENGTH = 200;

export type RandomQuote = { content: string; author: string };

let shortQuotes: Promise<RandomQuote[]> | null = null;

// Read at runtime, like signup.ts reads its email template, and cached per instance.
function loadShortQuotes() {
  shortQuotes ??= readFile(
    path.join(process.cwd(), "src", "content", "Notes", "pages", "quotes.json"),
    "utf-8",
  ).then((raw) =>
    (JSON.parse(raw) as RandomQuote[]).filter(
      ({ content, author }) => author && content && content.length <= MAX_LENGTH,
    ),
  );
  return shortQuotes;
}

/** One random quote from /quotes, for the booknotes easter egg. Read-only, unlike /api/random-quote. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const quotes = await loadShortQuotes();
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    if (!quote) return res.status(404).json({ message: "No quotes" });

    res.setHeader("Cache-Control", "no-store");
    const body: RandomQuote = { content: quote.content, author: cleanAuthor(quote.author) };
    return res.status(200).json(body);
  } catch {
    shortQuotes = null;
    return res.status(500).json({ message: "Quotes unavailable" });
  }
}

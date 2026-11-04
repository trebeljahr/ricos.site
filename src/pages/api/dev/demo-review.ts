/**
 * Dev-only endpoint behind the demo review on /computer/demos and the demo
 * pages: reads the review, sets one demo's verdict or note. The record stays in
 * private Notes (see demoReviewStore.ts). 404s in production and for any other
 * machine.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { computerDemos } from "src/lib/computerDemos";
import { applyReview, parseReviewUpdate } from "src/lib/demoReview";
import { readDemoReviews, writeDemoReviews } from "src/lib/demoReviewStore";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ error: "Not available" });
    return;
  }
  if (!servesPrivateNotes(process.env, clientAddresses(req))) {
    res.status(404).json({ error: "Not available" });
    return;
  }

  if (req.method === "GET") {
    try {
      res.status(200).json({ reviews: readDemoReviews() });
    } catch (error) {
      res.status(500).json({ error: `Could not read: ${String(error)}` });
    }
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { slug, verdict, note } = (req.body ?? {}) as Record<string, unknown>;
  if (!computerDemos.some((demo) => demo.slug === slug)) {
    res.status(400).json({ error: "Unknown demo" });
    return;
  }
  const update = parseReviewUpdate({ verdict, note });
  if (!update) {
    res.status(400).json({ error: "Send a known verdict or a note" });
    return;
  }

  try {
    const reviews = readDemoReviews();
    const next = applyReview(reviews, slug as string, update, new Date());
    if (next !== reviews) writeDemoReviews(next);
    res.status(200).json({ review: next[slug as string] ?? null });
  } catch (error) {
    res.status(500).json({ error: `Could not save: ${String(error)}` });
  }
}

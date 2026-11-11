/**
 * Dev-only endpoint behind the demo review on /computer/demos, /piano/demos and
 * the demo pages. Every request names its series (`?series=piano`; computer when
 * left out, see demoReviewSeries.ts). It reads the review, sets one demo's
 * verdict or note, takes pasted screenshots (`{ slug, image: { type, data } }`,
 * data in base64) and serves them back (`GET ?image=<name>`). The records stay in
 * private Notes (see demoReviewStore.ts). 404s in production and for any other
 * machine.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { applyReview, IMAGE_LIMIT, parseReviewUpdate, type ReviewUpdate } from "src/lib/demoReview";
import { isReviewSeries, seriesDemos } from "src/lib/demoReviewSeries";
import {
  isImageType,
  readDemoReviews,
  readReviewImage,
  saveReviewImage,
  writeDemoReviews,
} from "src/lib/demoReviewStore";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";

// Screenshots arrive as base64 in JSON; a full-screen retina PNG runs to a few MB.
export const config = { api: { bodyParser: { sizeLimit: "25mb" } } };

const IMAGE_BYTES_LIMIT = 15 * 1024 * 1024;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ error: "Not available" });
    return;
  }
  if (!servesPrivateNotes(process.env, clientAddresses(req))) {
    res.status(404).json({ error: "Not available" });
    return;
  }

  const series = req.query?.series ?? "computer";
  if (!isReviewSeries(series)) {
    res.status(400).json({ error: "Unknown series" });
    return;
  }

  if (req.method === "GET") {
    const image = req.query?.image;
    if (image !== undefined) {
      const found = typeof image === "string" ? readReviewImage(series, image) : null;
      if (!found) {
        res.status(404).json({ error: "No such image" });
        return;
      }
      res.setHeader("Content-Type", found.type);
      res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
      res.status(200).send(found.data);
      return;
    }
    try {
      res.status(200).json({ reviews: readDemoReviews(series) });
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

  const { slug, verdict, note, images, image } = (req.body ?? {}) as Record<string, unknown>;
  if (!seriesDemos(series).some((demo) => demo.slug === slug)) {
    res.status(400).json({ error: "Unknown demo" });
    return;
  }
  const name = slug as string;

  if (image !== undefined) {
    const { type, data } = (image ?? {}) as Record<string, unknown>;
    const bytes = typeof data === "string" ? Buffer.from(data, "base64") : null;
    if (!isImageType(type) || !bytes?.length || bytes.length > IMAGE_BYTES_LIMIT) {
      res.status(400).json({ error: "Send a PNG, JPEG, WebP or GIF under 15 MB" });
      return;
    }
    try {
      const reviews = readDemoReviews(series);
      const saved = reviews[name]?.images ?? [];
      if (saved.length >= IMAGE_LIMIT) {
        res.status(400).json({ error: `At most ${IMAGE_LIMIT} screenshots per note` });
        return;
      }
      const file = saveReviewImage(series, name, type, bytes);
      const next = applyReview(reviews, name, { images: [...saved, file] }, new Date());
      writeDemoReviews(series, next);
      res.status(200).json({ image: file, review: next[name] ?? null });
    } catch (error) {
      res.status(500).json({ error: `Could not save: ${String(error)}` });
    }
    return;
  }

  const update: ReviewUpdate | null = parseReviewUpdate({ verdict, note, images });
  if (!update) {
    res.status(400).json({ error: "Send a known verdict, a note or screenshots" });
    return;
  }

  try {
    const reviews = readDemoReviews(series);
    const next = applyReview(reviews, name, update, new Date());
    if (next !== reviews) writeDemoReviews(series, next);
    res.status(200).json({ review: next[name] ?? null });
  } catch (error) {
    res.status(500).json({ error: `Could not save: ${String(error)}` });
  }
}

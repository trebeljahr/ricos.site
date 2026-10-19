/**
 * Dev-only read/write endpoint for image alt text.
 *
 * Backs /dev/alt-review. `src/content/Notes/_data/metadata.json` is the single
 * source of truth for alt text (see src/scripts/syncImageAltMetadata.ts), so
 * this writes straight into it rather than keeping review state anywhere else:
 * close the tab, come back next week, the progress is still there — and it
 * lands in the Notes submodule as a normal commit.
 *
 * Two fields matter here:
 *   - `altSource: "manual"` is written for anything edited by hand. The sync
 *     script treats manual as untouchable, so a later AI pass cannot overwrite
 *     a description you fixed yourself.
 *   - `altReviewed: true` records "I looked at this and it was fine", which is
 *     what makes the review resumable across sessions.
 *
 * 404s in production; there is no auth because it never exists there.
 */
import { resolve } from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  type AltSource,
  editMetadataFile,
  type ImageMetadata,
  readMetadataFile,
} from "src/lib/metadataJsonFile";

const METADATA_PATH = resolve(process.cwd(), "src", "content", "Notes", "_data", "metadata.json");

export type AltEntry = {
  key: string;
  width: number;
  height: number;
  alt: string;
  altSource: AltSource | "none";
  reviewed: boolean;
};

export type AltUpdate = {
  key: string;
  alt?: string;
  reviewed?: boolean;
};

function toEntry(entry: ImageMetadata): AltEntry {
  return {
    key: entry.key,
    width: entry.width,
    height: entry.height,
    alt: entry.alt ?? "",
    altSource: entry.alt ? (entry.altSource ?? "generated") : "none",
    reviewed: entry.altReviewed === true,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not available in production" });
    return;
  }

  if (req.method === "GET") {
    const meta = await readMetadataFile(METADATA_PATH);
    const entries = Object.values(meta)
      .filter((entry): entry is ImageMetadata => typeof entry?.key === "string")
      .map(toEntry)
      .sort((a, b) => a.key.localeCompare(b.key));
    res.status(200).json({ entries });
    return;
  }

  if (req.method === "POST") {
    const updates = (req.body?.updates ?? []) as AltUpdate[];
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ error: "Send { updates: [{ key, alt?, reviewed? }] }" });
      return;
    }

    try {
      // A queued read-modify-write of a fresh read, saved by temp file and
      // rename, so a burst of saves cannot interleave and drop edits.
      let applied = 0;
      const unknown: string[] = [];
      await editMetadataFile(METADATA_PATH, (meta) => {
        for (const update of updates) {
          const entry = meta[update.key];
          if (!entry) {
            unknown.push(update.key);
            continue;
          }
          if (typeof update.alt === "string") {
            const alt = update.alt.trim();
            // An empty box means "no correction", not "ship an empty alt".
            if (alt.length > 0 && alt !== entry.alt) {
              entry.alt = alt;
              entry.altSource = "manual";
            }
          }
          if (typeof update.reviewed === "boolean") {
            if (update.reviewed) entry.altReviewed = true;
            else delete entry.altReviewed;
          }
          applied++;
        }
        return applied > 0;
      });

      res.status(200).json({ applied, unknown });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: `${req.method} not allowed` });
}

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
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { NextApiRequest, NextApiResponse } from "next";

const METADATA_PATH = resolve(process.cwd(), "src", "content", "Notes", "_data", "metadata.json");

type AltSource = "manual" | "generated" | "ai";

type MetadataEntry = {
  key: string;
  width: number;
  height: number;
  aspectRatio: number;
  existsInS3: boolean;
  alt?: string;
  altSource?: AltSource;
  altReviewed?: boolean;
};

type Metadata = Record<string, MetadataEntry>;

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

/**
 * Every write is a read-modify-write of one big file, so they run one at a
 * time. Without this a burst of saves can interleave and drop edits.
 */
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

async function readMetadata(): Promise<Metadata> {
  return JSON.parse(await readFile(METADATA_PATH, "utf-8")) as Metadata;
}

async function writeMetadata(meta: Metadata) {
  // Write beside the target and rename, so an interrupted write can never
  // leave a truncated metadata.json behind.
  const temporary = `${METADATA_PATH}.tmp`;
  await writeFile(temporary, `${JSON.stringify(meta, null, 2)}\n`);
  await rename(temporary, METADATA_PATH);
}

function toEntry(entry: MetadataEntry): AltEntry {
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
    const meta = await readMetadata();
    const entries = Object.values(meta)
      .filter((entry) => entry && typeof entry.key === "string")
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
      const saved = await serialize(async () => {
        const meta = await readMetadata();
        let applied = 0;
        const unknown: string[] = [];

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

        if (applied > 0) await writeMetadata(meta);
        return { applied, unknown };
      });

      res.status(200).json(saved);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: `${req.method} not allowed` });
}

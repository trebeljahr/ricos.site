/**
 * Dev-only read/write endpoint for the needlestack archive.
 *
 * Backs /dev/needlestack. Writes straight into
 * src/content/needlestack/needles.json — the same file the import and
 * classification scripts use and the public pages will read — so triage
 * progress survives restarts and ships as a normal commit.
 *
 * What this endpoint decides, rather than the client:
 *   - a rating only counts once the needle is `reviewed`, so a stray keypress
 *     in the browser cannot publish anything by itself;
 *   - an edited note is always `noteSource: "manual"`, which the skim pass
 *     refuses to overwrite;
 *   - door and path ids are checked against the taxonomy, so a renamed path
 *     cannot leave dangling references behind.
 *
 * 404s in production; there is no auth because it never exists there.
 */
import type { NextApiRequest, NextApiResponse } from "next";

import { readNeedles, serialize, writeNeedles } from "src/lib/needlestack/store";
import { isDoorId, isPathId } from "src/lib/needlestack/taxonomy";
import type { Needle, NeedleStatus, NeedleUpdate, Rating } from "src/lib/needlestack/types";
import { NEEDLE_TYPES } from "src/lib/needlestack/types";

const STATUSES: NeedleStatus[] = ["unclassified", "classified", "reviewed", "rejected"];

/** Local calendar date: a UTC date stamps yesterday for most of Rico's day. */
function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function applyUpdate(needle: Needle, update: NeedleUpdate): void {
  if (typeof update.title === "string" && update.title.trim()) needle.title = update.title.trim();

  if (update.type && NEEDLE_TYPES.includes(update.type)) needle.type = update.type;

  if (Array.isArray(update.topics)) {
    needle.topics = [
      ...new Set(
        update.topics
          .filter((topic): topic is string => typeof topic === "string")
          .map((topic) => topic.toLowerCase().trim().replace(/\s+/g, "-"))
          .filter(Boolean),
      ),
    ].slice(0, 8);
  }

  if (update.door !== undefined) {
    if (update.door === null) {
      delete needle.door;
      // Paths belong to a door, so they cannot outlive it.
      needle.paths = [];
    } else if (isDoorId(update.door)) {
      needle.door = update.door;
    }
  }

  if (Array.isArray(update.paths)) needle.paths = update.paths.filter(isPathId);

  if (update.minutes !== undefined) {
    if (update.minutes === null) delete needle.minutes;
    else if (Number.isFinite(update.minutes) && update.minutes > 0)
      needle.minutes = Math.round(update.minutes);
  }

  if (update.level !== undefined) {
    if (update.level === null) delete needle.level;
    else if (update.level === "intro" || update.level === "deep") needle.level = update.level;
  }

  if (update.rating !== undefined) {
    const rating = Math.round(Number(update.rating));
    if (rating >= 0 && rating <= 3) needle.rating = rating as Rating;
  }

  if (typeof update.note === "string") {
    const note = update.note.trim();
    if (note) {
      needle.note = note.slice(0, 600);
      needle.noteSource = "manual";
    } else {
      delete needle.note;
      delete needle.noteSource;
    }
  }

  if (update.status && STATUSES.includes(update.status)) {
    needle.status = update.status;
    if (update.status === "reviewed") needle.reviewedAt = today();
    // Un-reviewing has to drop the date too, or the archive claims a decision
    // that was taken back.
    else delete needle.reviewedAt;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ error: "Not available in production" });
    return;
  }

  if (req.method === "GET") {
    const needles = await readNeedles();
    res.status(200).json({ needles });
    return;
  }

  if (req.method === "POST") {
    const updates = (req.body?.updates ?? []) as NeedleUpdate[];
    if (!Array.isArray(updates) || updates.length === 0) {
      res.status(400).json({ error: "Send { updates: [{ id, ... }] }" });
      return;
    }

    try {
      const saved = await serialize(async () => {
        const needles = await readNeedles();
        const byId = new Map(needles.map((needle) => [needle.id, needle]));
        let applied = 0;
        const unknown: string[] = [];

        for (const update of updates) {
          const needle = byId.get(update.id);
          if (!needle) {
            unknown.push(update.id);
            continue;
          }
          applyUpdate(needle, update);
          applied++;
        }

        if (applied > 0) await writeNeedles([...byId.values()]);
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

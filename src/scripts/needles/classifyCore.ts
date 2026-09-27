/**
 * Shared machinery for the classification passes: what a model is asked, what
 * it is allowed to answer, and how an answer lands in needles.json.
 *
 * Two runners use this — classify.ts drives the `claude` CLI in batches, and
 * batch.ts writes the same prompts to files so an agent session can answer them
 * when the CLI has no usable login. Both funnel through `applyGuesses`, so the
 * rules about what a machine may and may not write live in exactly one place.
 */

import type { DoorId, PathId } from "src/lib/needlestack/taxonomy";
import { isDoorId, isPathId, taxonomyForPrompt } from "src/lib/needlestack/taxonomy";
import type { Level, Needle, NeedleGuess, NeedleType, Rating } from "src/lib/needlestack/types";
import { NEEDLE_TYPES } from "src/lib/needlestack/types";

export type GuessRow = {
  id: string;
  door?: string;
  paths?: string[];
  topics?: string[];
  type?: string;
  level?: string;
  rating?: number;
  confidence?: number;
  reason?: string;
};

/** What the model sees per link: title, URL and the folders it was filed in. */
export function promptRow(needle: Needle): string {
  const folders = needle.folders.slice(0, 3).join(" | ");
  const parts = [`id=${needle.id}`, `title=${needle.title.slice(0, 160)}`, `url=${needle.url}`];
  if (folders) parts.push(`folders=${folders.slice(0, 160)}`);
  if (needle.note) parts.push(`existing_note=${needle.note.slice(0, 240)}`);
  return parts.join("\n");
}

export function buildPrompt(needles: Needle[]): string {
  return `You are sorting links for a personal curated archive ("needlestack") owned by Rico, a software engineer who is into graphics programming, neuroscience, maths, biology, long bike and boat journeys, meditation, music and making things by hand.

Classify each link into this fixed taxonomy. Never invent a door or a path id.

${taxonomyForPrompt()}

Types: ${NEEDLE_TYPES.join(", ")}
Levels: intro, deep

For every link answer:
- door: the single best door id, or null if the link is plainly not worth a page (a login page, a dead tool, pure project research).
- paths: 1-2 path ids from that door, in order of fit. [] if nothing fits.
- topics: 2-4 lowercase free-form tags (e.g. "fourier", "buddhism", "rust"). No generic tags like "interesting" or "web".
- type: one of the types above, judged from the URL and title.
- level: "intro" if it assumes nothing, "deep" if it needs background.
- rating: how likely Rico would vouch for this publicly. 3 = obvious keeper, 2 = good, 1 = archive only, 0 = drop it.
- confidence: 0-1, how sure you are about door and paths from the title alone.
- reason: max 12 words, why this door.

Judge only from title, URL and folder names. Do not guess beyond them; low confidence is a useful answer.

Links:

${needles.map(promptRow).join("\n\n")}

Answer with a JSON array only, no prose, no markdown fence, one object per link:
[{"id":"...","door":"understand","paths":["how-brains-work"],"topics":["neuroscience","memory"],"type":"video","level":"intro","rating":2,"confidence":0.7,"reason":"lecture on memory formation"}]`;
}

/**
 * Models sometimes wrap JSON in prose or a fence even when told not to, so the
 * first balanced array in the output is extracted rather than trusting the shape.
 */
export function extractJsonArray(text: string): GuessRow[] {
  const start = text.indexOf("[");
  if (start === -1) throw new Error("no JSON array in model output");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "[") depth++;
    else if (char === "]") {
      depth--;
      if (depth === 0) {
        const parsed = JSON.parse(text.slice(start, index + 1));
        if (!Array.isArray(parsed)) throw new Error("model output was not an array");
        return parsed as GuessRow[];
      }
    }
  }
  throw new Error("unterminated JSON array in model output");
}

const asRating = (value: unknown): Rating | undefined => {
  const n = Math.round(Number(value));
  return n === 0 || n === 1 || n === 2 || n === 3 ? (n as Rating) : undefined;
};

const asLevel = (value: unknown): Level | undefined =>
  value === "intro" || value === "deep" ? value : undefined;

const asType = (value: unknown): NeedleType | undefined =>
  typeof value === "string" && NEEDLE_TYPES.includes(value as NeedleType)
    ? (value as NeedleType)
    : undefined;

function cleanTopics(topics: unknown): string[] {
  if (!Array.isArray(topics)) return [];
  return [
    ...new Set(
      topics
        .filter((topic): topic is string => typeof topic === "string")
        .map((topic) => topic.toLowerCase().trim().replace(/\s+/g, "-"))
        .filter((topic) => topic.length > 1 && topic.length < 40),
    ),
  ].slice(0, 4);
}

export type ApplyResult = {
  applied: number;
  unknownIds: string[];
  droppedPaths: string[];
  skipped: number;
};

/**
 * Writes a pass's answers onto needles, in place.
 *
 * Hard rules, because a machine must not be able to publish anything:
 *   - `rating` and `status: "reviewed"` stay Rico's. A guessed rating is kept
 *     under `guess.rating` and only sorts the queue.
 *   - anything already reviewed or rejected is left completely alone.
 *   - door and paths are prefilled so triage is one keystroke, but the needle
 *     stays at status "classified", which never renders publicly.
 *   - a path that does not sit in the chosen door is dropped, not remapped.
 */
export function applyGuesses(
  needles: Needle[],
  rows: GuessRow[],
  model: string,
  at = new Date().toISOString(),
): ApplyResult {
  const byId = new Map(needles.map((needle) => [needle.id, needle]));
  const result: ApplyResult = { applied: 0, unknownIds: [], droppedPaths: [], skipped: 0 };

  for (const row of rows) {
    const needle = typeof row.id === "string" ? byId.get(row.id) : undefined;
    if (!needle) {
      if (typeof row.id === "string") result.unknownIds.push(row.id);
      continue;
    }
    if (needle.status === "reviewed" || needle.status === "rejected") {
      result.skipped++;
      continue;
    }

    const door: DoorId | undefined = isDoorId(row.door) ? row.door : undefined;
    const paths: PathId[] = [];
    for (const candidate of row.paths ?? []) {
      if (!isPathId(candidate)) {
        result.droppedPaths.push(`${needle.id}:${String(candidate)}`);
        continue;
      }
      paths.push(candidate);
    }

    const guess: NeedleGuess = {
      door,
      paths,
      topics: cleanTopics(row.topics),
      type: asType(row.type),
      level: asLevel(row.level),
      rating: asRating(row.rating),
      confidence:
        typeof row.confidence === "number" ? Math.max(0, Math.min(1, row.confidence)) : undefined,
      reason: typeof row.reason === "string" ? row.reason.slice(0, 120) : undefined,
      model,
      at,
    };

    needle.guess = guess;
    needle.status = "classified";
    if (door) needle.door = door;
    if (paths.length > 0) needle.paths = paths;
    if (guess.topics && guess.topics.length > 0 && needle.topics.length === 0)
      needle.topics = guess.topics;
    if (guess.type) needle.type = guess.type;
    if (guess.level && !needle.level) needle.level = guess.level;
    result.applied++;
  }

  return result;
}

/** Cheapest-first review order: confident keepers before shaky maybes. */
export function queueOrder(a: Needle, b: Needle): number {
  const score = (needle: Needle) =>
    (needle.guess?.rating ?? 0) * 2 + (needle.guess?.confidence ?? 0);
  return score(b) - score(a);
}

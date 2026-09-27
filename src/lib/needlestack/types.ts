/**
 * The needlestack data model.
 *
 * One record per link. Everything the public pages need to slice the archive
 * lives here: what kind of thing it is, which door and paths it belongs to,
 * how good it is, and why Rico kept it.
 *
 * `rating` is the curation gate: 0 means "imported, not vouched for" and never
 * renders publicly. That is what makes it safe to bulk-import thousands of
 * bookmarks without diluting the stack.
 */
import type { DoorId, PathId } from "./taxonomy";

export type NeedleType =
  | "video"
  | "playlist"
  | "lecture"
  | "article"
  | "blog"
  | "book"
  | "paper"
  | "repo"
  | "tool"
  | "channel"
  | "podcast"
  | "interactive"
  | "other";

export const NEEDLE_TYPES: NeedleType[] = [
  "video",
  "playlist",
  "lecture",
  "article",
  "blog",
  "book",
  "paper",
  "repo",
  "tool",
  "channel",
  "podcast",
  "interactive",
  "other",
];

export type Level = "intro" | "deep";

/** 0 unrated (hidden), 1 archive only, 2 good, 3 front shelf. */
export type Rating = 0 | 1 | 2 | 3;

export type NeedleStatus =
  /** Imported, nothing but URL heuristics applied. */
  | "unclassified"
  /** A machine pass guessed door/paths/topics; still needs Rico. */
  | "classified"
  /** Rico looked at it. Only reviewed needles with rating >= 1 go public. */
  | "reviewed"
  /** Rico said no. Kept so re-imports cannot resurrect it. */
  | "rejected";

/**
 * Where the link came from. Pools exist because the bookmark export mixes
 * curation candidates with raw research: `best` is the hand-picked pool,
 * `newsletter` is issue source material, `projects` is research for a specific
 * project and rarely belongs in the stack at all.
 */
export type Pool = "needlestack" | "best" | "collections" | "newsletter" | "projects" | "tools";

export const POOLS: Pool[] = [
  "needlestack",
  "best",
  "collections",
  "newsletter",
  "projects",
  "tools",
];

/** What a machine pass suggested, kept apart from Rico's own answers. */
export type NeedleGuess = {
  door?: DoorId;
  paths?: PathId[];
  topics?: string[];
  type?: NeedleType;
  level?: Level;
  /** What the pass would rate it, 0-3. Never written to `rating` directly. */
  rating?: Rating;
  /** 0-1, the pass's own confidence. Used to sort the review queue. */
  confidence?: number;
  /** One line explaining the guess, so a wrong door is easy to spot. */
  reason?: string;
  model?: string;
  at?: string;
};

export type Needle = {
  /** Stable hash of the normalized URL; survives re-imports and retitling. */
  id: string;
  url: string;
  title: string;
  type: NeedleType;
  topics: string[];
  door?: DoorId;
  paths: PathId[];
  /** Time commitment in minutes, when known. Drives the "I have 20 min" filter. */
  minutes?: number;
  level?: Level;
  rating: Rating;
  /** Why this is here, in Rico's voice. The actual curation. */
  note?: string;
  noteSource?: "manual" | "ai" | "needlestack-md";
  status: NeedleStatus;
  pool: Pool;
  /** Bookmark folder paths this URL was filed under, for context while triaging. */
  folders: string[];
  /** Newsletter issue that featured it, when the folder said so. */
  newsletter?: number;
  /** True for links already published on the old needlestack page. */
  inNeedlestackMd?: boolean;
  /** ISO date, from the bookmark's add_date when available. */
  addedAt?: string;
  /**
   * The page is gone (404, 410, no such host), set by the metadata pass. Kept
   * on the needle rather than only in meta.json so the public filter and the
   * triage filters can see it without loading the metadata file.
   */
  dead?: boolean;
  reviewedAt?: string;
  guess?: NeedleGuess;
};

/** Written by the triage UI; the API applies only these fields. */
export type NeedleUpdate = {
  id: string;
  title?: string;
  type?: NeedleType;
  topics?: string[];
  door?: DoorId | null;
  paths?: PathId[];
  minutes?: number | null;
  level?: Level | null;
  rating?: Rating;
  note?: string;
  status?: NeedleStatus;
};

export const isPublic = (needle: Needle): boolean =>
  needle.status === "reviewed" && needle.rating >= 1 && needle.dead !== true;

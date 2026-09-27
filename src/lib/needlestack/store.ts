/**
 * Reading and writing src/content/needlestack/needles.json.
 *
 * Single flat file on purpose: it diffs as a normal commit, it is trivial to
 * grep, and at a few thousand records it loads faster than any database would
 * be worth. Writes go through a temp file and a rename so an interrupted save
 * can never leave a truncated archive behind, and through `serialize` so a
 * burst of edits from the triage UI cannot interleave and drop one.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import type { NeedleMeta } from "./meta";
import type { PathId } from "./taxonomy";
import type { Needle } from "./types";

export const NEEDLESTACK_DIR = resolve(process.cwd(), "src", "content", "needlestack");
export const NEEDLES_JSON = resolve(NEEDLESTACK_DIR, "needles.json");
export const PATHS_JSON = resolve(NEEDLESTACK_DIR, "paths.json");
/**
 * Fetched page metadata, keyed by needle id, in its own file: it is machine
 * output that changes on every refetch, and keeping it out of needles.json
 * leaves that file a readable diff of curation decisions.
 */
export const META_JSON = resolve(NEEDLESTACK_DIR, "meta.json");

/** Ordering and intro copy per path: the curated part of a path page. */
export type PathCuration = {
  /** Needle ids in the order Rico wants them read or watched. */
  order: string[];
  /** Optional intro paragraph for the path page. */
  intro?: string;
};

export type PathsFile = Partial<Record<PathId, PathCuration>>;

export async function readNeedles(): Promise<Needle[]> {
  if (!existsSync(NEEDLES_JSON)) return [];
  const raw = await readFile(NEEDLES_JSON, "utf8");
  const parsed = JSON.parse(raw) as Needle[];
  return Array.isArray(parsed) ? parsed : [];
}

async function writeJson(target: string, data: unknown) {
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(data, undefined, 2)}\n`);
  await rename(temporary, target);
}

export async function writeNeedles(needles: Needle[]): Promise<void> {
  // Sort so the file diff stays readable across runs: newest first, then id.
  const sorted = [...needles].sort((a, b) => {
    const dateDiff = (b.addedAt ?? "").localeCompare(a.addedAt ?? "");
    return dateDiff !== 0 ? dateDiff : a.id.localeCompare(b.id);
  });
  await writeJson(NEEDLES_JSON, sorted);
}

export type MetaFile = Record<string, NeedleMeta>;

export async function readMeta(): Promise<MetaFile> {
  if (!existsSync(META_JSON)) return {};
  return JSON.parse(await readFile(META_JSON, "utf8")) as MetaFile;
}

export async function writeMeta(meta: MetaFile): Promise<void> {
  // Sorted by id so a refetch of one link does not reshuffle the file.
  const sorted = Object.fromEntries(Object.entries(meta).sort(([a], [b]) => a.localeCompare(b)));
  await writeJson(META_JSON, sorted);
}

export async function readPaths(): Promise<PathsFile> {
  if (!existsSync(PATHS_JSON)) return {};
  return JSON.parse(await readFile(PATHS_JSON, "utf8")) as PathsFile;
}

export async function writePaths(paths: PathsFile): Promise<void> {
  await writeJson(PATHS_JSON, paths);
}

/**
 * One write at a time. Every save is a read-modify-write of the whole file, so
 * concurrent handlers would otherwise clobber each other's edits.
 */
let queue: Promise<unknown> = Promise.resolve();

export function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = queue.then(task, task);
  queue = next.catch(() => undefined);
  return next;
}

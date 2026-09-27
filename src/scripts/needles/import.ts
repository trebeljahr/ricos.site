/**
 * Imports links into src/content/needlestack/needles.json.
 *
 *   pnpm needles:import                                  both sources, pool "best"
 *   pnpm needles:import --bookmarks ~/Downloads/bm.html  a specific export
 *   pnpm needles:import --pools best,tools,collections   widen what comes in
 *   pnpm needles:import --folder "Science/Neuroscience"  one subtree only
 *   pnpm needles:import --md                             the old needlestack page
 *   pnpm needles:import --dry-run                        counts, no write
 *
 * Idempotent: everything is keyed by the normalized URL, so re-running after
 * adding bookmarks only ever adds. Rico's own answers (rating, note, door,
 * paths, status) are never overwritten, and a needle he rejected stays
 * rejected even if the link is still bookmarked.
 *
 * Only `best` and the old needlestack page are imported by default. The bookmark
 * export also holds newsletter source links and per-project research — real
 * material, but not curation candidates, so those pools are opt-in.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

import { readNeedles, writeNeedles } from "src/lib/needlestack/store";
import type { Needle, Pool } from "src/lib/needlestack/types";
import { POOLS } from "src/lib/needlestack/types";
import { inferType, isBlocked, needleId, normalizeUrl } from "src/lib/needlestack/url";

import { type BookmarkLink, parseBookmarksFile } from "./parseBookmarks";

const NEEDLESTACK_MD = resolve(process.cwd(), "src", "content", "Notes", "pages", "needlestack.md");
const DOWNLOADS = resolve(homedir(), "Downloads");

type Candidate = {
  url: string;
  title: string;
  folder: string[];
  pool: Pool;
  addedAt?: string;
  note?: string;
  fromMd?: boolean;
};

/** Later pools win when the same URL is filed in several places. */
const POOL_RANK: Record<Pool, number> = {
  projects: 0,
  newsletter: 1,
  collections: 2,
  tools: 3,
  best: 4,
  needlestack: 5,
};

function poolOf(folder: string[]): Pool {
  const path = folder.join("/");
  if (/^Best(\/|$)/.test(path)) return "best";
  if (/^Tools(\/|$)/.test(path)) return "tools";
  if (/\bnewsletter\b/i.test(path)) return "newsletter";
  if (/(^|\/)Projects(\/|$)/.test(path)) return "projects";
  return "collections";
}

function parseArgs(argv: string[]) {
  const flag = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? undefined : (argv[index + 1] ?? "");
  };
  const has = (name: string) => argv.includes(`--${name}`);
  return {
    bookmarks: flag("bookmarks"),
    md: flag("md"),
    onlyMd: has("md") && !has("bookmarks") && argv.length === 1,
    pools: (flag("pools") ?? "best").split(",").filter(Boolean) as Pool[],
    folder: flag("folder"),
    dryRun: has("dry-run"),
  };
}

/** Newest bookmarks_*.html in ~/Downloads, so the usual case needs no argument. */
async function newestExport(): Promise<string | undefined> {
  if (!existsSync(DOWNLOADS)) return undefined;
  const { readdir, stat } = await import("node:fs/promises");
  const files = (await readdir(DOWNLOADS)).filter((name) => /^bookmarks.*\.html$/i.test(name));
  let newest: { file: string; mtime: number } | undefined;
  for (const file of files) {
    const info = await stat(resolve(DOWNLOADS, file));
    if (!newest || info.mtimeMs > newest.mtime) newest = { file, mtime: info.mtimeMs };
  }
  return newest ? resolve(DOWNLOADS, newest.file) : undefined;
}

function candidatesFromBookmarks(links: BookmarkLink[]): Candidate[] {
  return links.map((link) => ({
    url: link.url,
    title: link.title,
    folder: link.folder,
    pool: poolOf(link.folder),
    addedAt: link.addedAt ? new Date(link.addedAt * 1000).toISOString().slice(0, 10) : undefined,
    // "Already in Needlestack" folders are Rico's own dedupe marker.
    fromMd: link.folder.some((name) => /already in needlestack/i.test(name)),
  }));
}

const LINK_PATTERN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

/**
 * Pulls links out of the old needlestack page, keeping the section they sat in
 * as folder context and any prose on the same line as a note candidate. Those
 * sentences are the existing curation, so they are worth more than the titles.
 */
function candidatesFromMarkdown(markdown: string): Candidate[] {
  const candidates: Candidate[] = [];
  let h2 = "";
  let h3 = "";

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    const heading = line.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      if (heading[1].length === 2) {
        h2 = heading[2].trim();
        h3 = "";
      } else {
        h3 = heading[2].trim();
      }
      continue;
    }

    const matches = [...line.matchAll(LINK_PATTERN)];
    if (matches.length === 0) continue;

    // Only a line with a single link can have its prose attributed to it.
    const rest =
      matches.length === 1
        ? line
            .replace(LINK_PATTERN, " ")
            .replace(/^[-*\d.\s]+/, "")
            .replace(/[*_`]/g, "")
            .trim()
        : "";

    for (const match of matches) {
      candidates.push({
        url: match[2],
        title: match[1].replace(/[*_`]/g, "").trim(),
        folder: ["needlestack.md", h2, h3].filter(Boolean),
        pool: "needlestack",
        note: rest.length > 40 ? rest : undefined,
        fromMd: true,
      });
    }
  }

  return candidates;
}

function fresh(candidate: Candidate, id: string, url: string): Needle {
  return {
    id,
    url,
    title: candidate.title || url,
    type: inferType(url, candidate.title),
    topics: [],
    paths: [],
    // Links already on the public page passed the bar once, so they start at 2
    // and only need a door and a path. Everything else starts hidden at 0.
    rating: candidate.fromMd ? 2 : 0,
    note: candidate.note,
    noteSource: candidate.note ? "needlestack-md" : undefined,
    status: "unclassified",
    pool: candidate.pool,
    folders: candidate.folder.length > 0 ? [candidate.folder.join("/")] : [],
    newsletter: newsletterIssue(candidate.folder),
    inNeedlestackMd: candidate.fromMd || undefined,
    addedAt: candidate.addedAt,
  };
}

function newsletterIssue(folder: string[]): number | undefined {
  for (const name of folder) {
    const match = name.match(/newsletter\s*#?(\d+)/i);
    if (match) return Number(match[1]);
  }
  return undefined;
}

/** Adds context to an existing needle without touching a single human answer. */
function merge(existing: Needle, candidate: Candidate): Needle {
  const folder = candidate.folder.join("/");
  const folders =
    folder && !existing.folders.includes(folder) ? [...existing.folders, folder] : existing.folders;

  return {
    ...existing,
    // A retitled bookmark is worth picking up until someone has reviewed it.
    title: existing.status === "unclassified" && candidate.title ? candidate.title : existing.title,
    pool: POOL_RANK[candidate.pool] > POOL_RANK[existing.pool] ? candidate.pool : existing.pool,
    folders,
    newsletter: existing.newsletter ?? newsletterIssue(candidate.folder),
    inNeedlestackMd: existing.inNeedlestackMd || candidate.fromMd || undefined,
    addedAt:
      existing.addedAt && candidate.addedAt
        ? existing.addedAt < candidate.addedAt
          ? existing.addedAt
          : candidate.addedAt
        : (existing.addedAt ?? candidate.addedAt),
    note: existing.note ?? candidate.note,
    noteSource: existing.note
      ? existing.noteSource
      : candidate.note
        ? "needlestack-md"
        : existing.noteSource,
    rating:
      existing.status === "unclassified" && candidate.fromMd && existing.rating === 0
        ? 2
        : existing.rating,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const unknownPools = args.pools.filter((pool) => !POOLS.includes(pool));
  if (unknownPools.length > 0) {
    console.error(`Unknown pool(s): ${unknownPools.join(", ")}. Known: ${POOLS.join(", ")}`);
    process.exit(1);
  }

  const candidates: Candidate[] = [];
  const stats = { parsed: 0, blocked: 0, unusable: 0, offPool: 0, offFolder: 0 };

  const mdPath = args.md && args.md !== "" ? resolve(args.md) : NEEDLESTACK_MD;
  if (existsSync(mdPath)) {
    const fromMd = candidatesFromMarkdown(await readFile(mdPath, "utf8"));
    stats.parsed += fromMd.length;
    candidates.push(...fromMd);
    console.log(`needlestack.md: ${fromMd.length} links`);
  } else {
    // Worktrees get an empty Notes submodule, so this is normal, not an error.
    console.log(`needlestack.md not found at ${mdPath} — skipping (pass --md <path>)`);
  }

  const bookmarksPath = args.bookmarks ? resolve(args.bookmarks) : await newestExport();
  if (bookmarksPath && existsSync(bookmarksPath)) {
    const links = await parseBookmarksFile(bookmarksPath);
    const fromBookmarks = candidatesFromBookmarks(links);
    stats.parsed += fromBookmarks.length;
    console.log(`${bookmarksPath}: ${fromBookmarks.length} bookmarks`);
    for (const candidate of fromBookmarks) {
      if (
        args.folder &&
        !candidate.folder.join("/").toLowerCase().includes(args.folder.toLowerCase())
      ) {
        stats.offFolder++;
        continue;
      }
      if (!args.pools.includes(candidate.pool) && !candidate.fromMd) {
        stats.offPool++;
        continue;
      }
      candidates.push(candidate);
    }
  } else if (args.bookmarks) {
    console.error(`No bookmark export at ${bookmarksPath}`);
    process.exit(1);
  }

  const needles = await readNeedles();
  const byId = new Map(needles.map((needle) => [needle.id, needle]));
  let added = 0;
  let updated = 0;

  for (const candidate of candidates) {
    const url = normalizeUrl(candidate.url);
    if (!url) {
      stats.unusable++;
      continue;
    }
    if (isBlocked(url, candidate.title)) {
      stats.blocked++;
      continue;
    }

    const id = needleId(url);
    const existing = byId.get(id);
    if (existing) {
      const next = merge(existing, candidate);
      if (JSON.stringify(next) !== JSON.stringify(existing)) updated++;
      byId.set(id, next);
    } else {
      byId.set(id, fresh(candidate, id, url));
      added++;
    }
  }

  const result = [...byId.values()];
  const unreviewed = result.filter((needle) => needle.status === "unclassified").length;
  const classified = result.filter((needle) => needle.status === "classified").length;

  console.log(
    [
      `parsed ${stats.parsed}`,
      `skipped ${stats.offPool} off-pool, ${stats.offFolder} off-folder`,
      `${stats.blocked} blocked, ${stats.unusable} unusable`,
      `-> ${added} new, ${updated} updated, ${result.length} total`,
      `(${unreviewed} unclassified, ${classified} waiting for review)`,
    ].join("\n"),
  );

  if (args.dryRun) {
    console.log("--dry-run: nothing written");
    return;
  }
  await writeNeedles(result);
  console.log("wrote src/content/needlestack/needles.json");
}

void main();

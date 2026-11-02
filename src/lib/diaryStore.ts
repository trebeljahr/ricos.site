// Server side of /dev/diary: reads Rico's private texts and the read log.
// Server-only (node:fs). Diaries, morning pages and retros must never leave
// this machine, so every caller checks servesPrivateNotes() first, and
// next.config.mjs keeps Notes/texts out of every deployed function. This repo is
// public, so everything this page saves stays in Notes/texts as well: the
// retro picks and the read log.

import fs from "node:fs";
import type { IncomingMessage } from "node:http";
import path from "node:path";
import matter from "gray-matter";
import { countWords } from "./computerSeries";
import {
  buildEntries,
  cleanBody,
  DIARY_LOG_FILE,
  type DiaryEntry,
  type DiaryFile,
  type DiaryLog,
  kindOf,
  morningPageRel,
  type RetroPicks,
} from "./diary";

export const textsDir = () =>
  process.env.DIARY_TEXTS_DIR ?? path.join("src", "content", "Notes", "texts");

const RETRO_PICKS_FILE = "diary-retro-picks.json";

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/** The socket's address and every address a proxy put in X-Forwarded-For. */
export function clientAddresses(req: Pick<IncomingMessage, "socket" | "headers">): string[] {
  const forwarded = req.headers["x-forwarded-for"];
  const list = (Array.isArray(forwarded) ? forwarded.join(",") : (forwarded ?? ""))
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  return [req.socket?.remoteAddress ?? "", ...list];
}

/**
 * True only under `next dev`, off Vercel, for a request from this machine.
 * `next dev` listens on every interface, so without the address check anyone
 * on the same Wi-Fi could open /dev/diary.
 */
export function servesPrivateNotes(
  env: { NODE_ENV?: string; VERCEL?: string },
  addresses: string[],
): boolean {
  if (env.NODE_ENV !== "development" || env.VERCEL) return false;
  return addresses.length > 0 && addresses.every((a) => LOOPBACK.has(a));
}

export function readEntries(dir: string): DiaryEntry[] {
  if (!fs.existsSync(dir)) return [];
  const files: DiaryFile[] = fs
    .readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((file) => file.split(path.sep).join("/"))
    .filter((rel) => kindOf(rel) !== null)
    .flatMap((rel) => {
      const full = path.resolve(dir, rel);
      try {
        const { data, content } = matter(fs.readFileSync(full, "utf8"));
        return [{ rel, path: full, title: data.title, content }];
      } catch (error) {
        console.warn(`Could not read ${full}:`, error);
        return [];
      }
    });
  return buildEntries(files, readRetroPicks(dir));
}

function readRetroPicks(dir: string): RetroPicks {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, RETRO_PICKS_FILE), "utf8")) as RetroPicks;
  } catch {
    return {};
  }
}

/** Today's morning page and its word count, or null words while it does not exist yet. */
export function readMorningPage(
  dir: string,
  today: string,
): { path: string; words: number | null } {
  const full = path.resolve(dir, morningPageRel(today));
  try {
    return {
      path: full,
      words: countWords(cleanBody(matter(fs.readFileSync(full, "utf8")).content)),
    };
  } catch {
    return { path: full, words: null };
  }
}

const logFile = () => path.join(textsDir(), DIARY_LOG_FILE);

export function readLog(): DiaryLog {
  try {
    const log = JSON.parse(fs.readFileSync(logFile(), "utf8")) as DiaryLog;
    return Array.isArray(log.events) ? log : { events: [] };
  } catch {
    return { events: [] };
  }
}

export function writeLog(log: DiaryLog): void {
  fs.writeFileSync(logFile(), `${JSON.stringify(log, undefined, 2)}\n`);
}

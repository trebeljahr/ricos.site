// The reading loop behind /dev/diary: Rico's diaries, morning pages, weekly
// retros, dreams, essays and tiny thoughts, served back one entry a day so old
// thoughts get read again instead of only piling up. Pure functions;
// diaryStore.ts reads the files and the read log.

import { countWords } from "./computerSeries";

export type DiaryKind = "diary" | "morning-pages" | "retro" | "dream" | "essay" | "thoughts";

export const KIND_LABEL: Record<DiaryKind, string> = {
  diary: "Diary entry",
  "morning-pages": "Morning page",
  retro: "Weekly retro",
  dream: "Dream",
  essay: "Essay",
  thoughts: "Tiny thoughts",
};

/**
 * Which files under Notes/texts/ count, by path relative to it. The Notion
 * export is mostly to-do lists; only its weekly retros carry diary prose.
 */
export function kindOf(rel: string): DiaryKind | null {
  const name = rel.split("/").pop() ?? "";
  if (!name.endsWith(".md") || name.startsWith("_")) return null;
  if (rel.startsWith("diary-entries/")) return "diary";
  if (rel.startsWith("morning-pages/")) return "morning-pages";
  if (rel.startsWith("notion/") && rel.includes("/Weekly Retros/")) {
    return /TEMPLATE/i.test(name) ? null : "retro";
  }
  if (rel.startsWith("dreams/")) return "dream";
  if (rel.startsWith("essays/")) return "essay";
  if (rel === "misc/tiny-thoughts.md") return "thoughts";
  return null;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const noon = (day: string) => Date.parse(`${day}T12:00:00Z`);
const addDays = (day: string, n: number) =>
  new Date(noon(day) + n * DAY_MS).toISOString().slice(0, 10);

function validDay(year: number, month: number, date: number): string | null {
  const d = new Date(Date.UTC(year, month - 1, date, 12));
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== date) return null;
  return d.toISOString().slice(0, 10);
}

/** Monday of ISO week `week`: week 1 is the one that holds 4 January. */
function isoWeekMonday(year: number, week: number): string | null {
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(Date.UTC(year, 0, 4, 12));
  const monday = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * DAY_MS;
  return new Date(monday + (week - 1) * 7 * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The day an entry was written, from its file name only: "2019-12-15-….md"
 * or a retro's "2025 - CW 47.md". Frontmatter dates are left out on purpose,
 * because most essays carry the same import placeholder.
 */
export function entryDate(rel: string): string | null {
  const name = rel.split("/").pop() ?? "";
  const iso = name.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return validDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const week = name.match(/^(\d{4}) - CW ?(\d{1,2})\b/);
  if (week) return isoWeekMonday(Number(week[1]), Number(week[2]));
  return null;
}

/** Obsidian syntax that reads as noise outside Obsidian: comments, embeds, wikilinks. */
export function cleanBody(markdown: string): string {
  return markdown
    .replace(/%%[\s\S]*?%%/g, "")
    .replace(/!\[\[[^\]]*\]\]/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .trim();
}

function humanize(name: string): string {
  const words = name.replace(/[-_]+/g, " ").replace(/,/g, ", ").replace(/\s+/g, " ").trim();
  return words ? words[0].toUpperCase() + words.slice(1) : "";
}

/** Frontmatter title, else the first heading, else the file name without its date. */
export function entryTitle(rel: string, kind: DiaryKind, title: unknown, body: string): string {
  if (typeof title === "string" && title.trim()) return title.trim();
  const heading = body.match(/^#{1,3}\s+(.+)$/m);
  if (heading) return heading[1].trim();
  const stem = (rel.split("/").pop() ?? "").replace(/\.md$/, "");
  const rest = stem
    .replace(/^\d{4}-\d{2}-\d{2}-?/, "")
    .replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)-?/i, "");
  return humanize(rest) || KIND_LABEL[kind];
}

/** An entry longer than this is served in parts of about PART_TARGET words. */
export const WHOLE_MAX = 1800;
export const PART_TARGET = 1200;
/** Shorter than this is an empty stub, e.g. a retro marked "MISSED". */
export const MIN_WORDS = 40;

const isHeading = (block: string) => /^#{1,6}\s/.test(block);

/**
 * Splits a long text at paragraph breaks into parts of at least PART_TARGET
 * words. A heading never ends a part, and a short tail joins the part before.
 */
export function splitParts(body: string): string[] {
  if (countWords(body) <= WHOLE_MAX) return [body];
  const blocks = body.split(/\n\s*\n/).filter((b) => b.trim());
  const parts: string[][] = [[]];
  let words = 0;
  for (const block of blocks) {
    const current = parts[parts.length - 1];
    if (words >= PART_TARGET && current.length > 0) {
      const carried =
        current.length > 1 && isHeading(current[current.length - 1])
          ? [current.pop() as string]
          : [];
      parts.push(carried);
      words = carried.reduce((sum, b) => sum + countWords(b), 0);
    }
    parts[parts.length - 1].push(block);
    words += countWords(block);
  }
  if (parts.length > 1 && words < PART_TARGET / 4) {
    const tail = parts.pop() as string[];
    parts[parts.length - 1].push(...tail);
  }
  return parts.map((p) => p.join("\n\n"));
}

export type DiaryEntry = {
  /** Path under Notes/texts/; a part adds "#" and its first few words. */
  id: string;
  /** Absolute path, for the Obsidian link. */
  path: string;
  rel: string;
  kind: DiaryKind;
  title: string;
  date: string | null;
  words: number;
  body: string;
  part: { index: number; count: number } | null;
};

export type DiaryFile = { rel: string; path: string; title?: unknown; content: string };

const fingerprint = (text: string) =>
  (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 6).join("-");

export function buildEntries(files: DiaryFile[]): DiaryEntry[] {
  const entries: DiaryEntry[] = [];
  for (const file of files) {
    const kind = kindOf(file.rel);
    if (!kind) continue;
    const cleaned = cleanBody(file.content);
    if (countWords(cleaned) < MIN_WORDS) continue;
    const title = entryTitle(file.rel, kind, file.title, cleaned);
    // The page shows the title above the text; a heading that repeats it goes.
    const body = cleaned.replace(/^#{1,3}\s+(.+)\n*/, (line, text: string) =>
      text.trim() === title ? "" : line,
    );
    const date = entryDate(file.rel);
    const parts = splitParts(body);
    const seen = new Set<string>();
    parts.forEach((part, index) => {
      let id = file.rel;
      if (parts.length > 1) {
        id = `${file.rel}#${fingerprint(part) || index + 1}`;
        if (seen.has(id)) id = `${id}-${index + 1}`;
        seen.add(id);
      }
      entries.push({
        id,
        path: file.path,
        rel: file.rel,
        kind,
        title,
        date,
        words: countWords(part),
        body: part,
        part: parts.length > 1 ? { index: index + 1, count: parts.length } : null,
      });
    });
  }
  return entries;
}

/** Which entries were read or skipped on which day, gitignored like .writing-progress.json. */
export const DIARY_LOG_FILE = ".diary-progress.json";

export type DiaryEvent = { day: string; id: string; action: "read" | "skip"; words: number };
export type DiaryLog = { events: DiaryEvent[] };

export function addEvent(log: DiaryLog, event: DiaryEvent): DiaryLog {
  return { events: [...log.events, event] };
}

/** Takes back today's read or skip of one entry. */
export function undoToday(log: DiaryLog, id: string, today: string): DiaryLog {
  return { events: log.events.filter((e) => !(e.id === id && e.day === today)) };
}

/** A read entry rests this long before it can come back. */
export const REST_DAYS = 365;
/** How close to today's date, in any earlier year, counts as "on this day". */
export const ON_THIS_DAY = 7;

/** Days between two dates' places in the year, ignoring the year. */
function yearDayGap(a: string, b: string): number {
  const inYear = (day: string) => {
    const d = new Date(noon(day));
    return Math.round((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1, 12)) / DAY_MS);
  };
  const gap = Math.abs(inYear(a) - inYear(b));
  return Math.min(gap, 365 - gap);
}

const daysBetween = (from: string, to: string) => Math.round((noon(to) - noon(from)) / DAY_MS);

/** Deterministic number in (0, 1) per string: FNV-1a. */
function unit(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) + 0.5) / 2 ** 32;
}

const monthYear = (day: string) =>
  new Date(noon(day)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export type Candidate = { entry: DiaryEntry; reason: string };

/**
 * Today's reading order: a weighted shuffle, the same all day, so reloading
 * the page does not change the pick. Entries from this week in earlier years
 * weigh most, older entries more than recent ones, and anything read in the
 * last year sits out.
 */
export function dailyOrder(entries: DiaryEntry[], log: DiaryLog, today: string): Candidate[] {
  const lastRead = new Map<string, string>();
  for (const e of log.events) {
    if (e.action !== "read" || e.day >= today) continue;
    if ((lastRead.get(e.id) ?? "") < e.day) lastRead.set(e.id, e.day);
  }
  const year = Number(today.slice(0, 4));
  const ranked: { candidate: Candidate; key: number }[] = [];
  for (const entry of entries) {
    const read = lastRead.get(entry.id);
    if (read && daysBetween(read, today) < REST_DAYS) continue;
    let weight = 1.5;
    let reason = "Not re-read yet";
    if (entry.date) {
      const age = daysBetween(entry.date, today);
      const years = year - Number(entry.date.slice(0, 4));
      weight = age < 30 ? 0.25 : 1 + Math.min(age / 365, 5) / 2;
      reason = `Not re-read yet · from ${monthYear(entry.date)}`;
      if (years > 0 && age >= 300 && yearDayGap(entry.date, today) <= ON_THIS_DAY) {
        weight *= 8;
        const ago = years === 1 ? "a year ago" : `${years} years ago`;
        reason = yearDayGap(entry.date, today) === 0 ? `On this day, ${ago}` : `This week, ${ago}`;
      }
    }
    if (read) {
      weight *= 0.5;
      reason = `Last read ${monthYear(read)}`;
    }
    ranked.push({
      candidate: { entry, reason },
      key: -Math.log(unit(`${today}|${entry.id}`)) / weight,
    });
  }
  return ranked.sort((a, b) => a.key - b.key).map((r) => r.candidate);
}

/** The first entry in today's order not yet read or skipped today. */
export function todaysPick(order: Candidate[], log: DiaryLog, today: string): Candidate | null {
  const handled = new Set(log.events.filter((e) => e.day === today).map((e) => e.id));
  return order.find((c) => !handled.has(c.entry.id)) ?? null;
}

export function readToday(log: DiaryLog, today: string): DiaryEvent[] {
  return log.events.filter((e) => e.day === today && e.action === "read");
}

/** Words per day: written from dated entries, read from the log. */
export function wordsByDay(entries: DiaryEntry[], log: DiaryLog) {
  const written: Record<string, number> = {};
  for (const e of entries) if (e.date) written[e.date] = (written[e.date] ?? 0) + e.words;
  const read: Record<string, number> = {};
  for (const e of log.events) if (e.action === "read") read[e.day] = (read[e.day] ?? 0) + e.words;
  return { written, read };
}

export type DiaryStats = {
  /** Last 30 days, today included. */
  written: number;
  read: number;
  daysWritten: number;
  daysRead: number;
  /** Entries and words read at least once, against the whole archive. */
  entriesMet: number;
  entries: number;
  wordsMet: number;
  words: number;
};

export function diaryStats(entries: DiaryEntry[], log: DiaryLog, today: string): DiaryStats {
  const { written, read } = wordsByDay(entries, log);
  const window = Array.from({ length: 30 }, (_, i) => addDays(today, -i));
  const met = new Set(log.events.filter((e) => e.action === "read").map((e) => e.id));
  const metEntries = entries.filter((e) => met.has(e.id));
  return {
    written: window.reduce((sum, d) => sum + (written[d] ?? 0), 0),
    read: window.reduce((sum, d) => sum + (read[d] ?? 0), 0),
    daysWritten: window.filter((d) => (written[d] ?? 0) > 0).length,
    daysRead: window.filter((d) => (read[d] ?? 0) > 0).length,
    entriesMet: metEntries.length,
    entries: entries.length,
    wordsMet: metEntries.reduce((sum, e) => sum + e.words, 0),
    words: entries.reduce((sum, e) => sum + e.words, 0),
  };
}

/** Where today's morning page lives: morning-pages/2026-11-November/2026-11-02.md. */
export function morningPageRel(today: string): string {
  const month = new Date(noon(today)).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  return `morning-pages/${today.slice(0, 7)}-${month}/${today}.md`;
}

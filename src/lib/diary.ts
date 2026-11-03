// The reading loop behind /dev/diary: Rico's diaries, morning pages, weekly
// retros, dreams, essays and tiny thoughts, served back one entry a day so old
// thoughts get read again instead of only piling up. Everything shows whole and
// long texts arrive in order; only weekly retros are narrowed to their
// interesting blocks, word for word and with their gaps marked (see curateRetro).
// Pure functions; diaryStore.ts reads the files and the read log.

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

/** A block that is only a heading line; one with text right under it has its own words. */
const isHeading = (block: string) => /^#{1,6}\s[^\n]*$/.test(block.trim());

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

/** FNV-1a, as an unsigned 32-bit number. */
export function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** One top-level bullet with everything nested under it, or one paragraph, word for word. */
export type TextBlock = { heading: string; text: string; hash: string };

/**
 * A block's identity in the curation files. Only its opening counts, so a
 * sentence added at the end later on does not change its verdict.
 */
export function blockHash(text: string): string {
  const opening = text.replace(/\s+/g, " ").trim().slice(0, 80);
  return fnv1a(opening).toString(16).padStart(8, "0");
}

const LIST_ITEM = /^([-*+]|\d+[.)])\s/;
const SECTION_LINE = /^(#{1,6}\s.*|\*\*[^*]+\*\*:?\s*)$/;

/** Cuts a text into blocks, each under the heading line it sits below. */
export function textBlocks(markdown: string): TextBlock[] {
  const blocks: { heading: string; lines: string[] }[] = [];
  let heading = "";
  let current: string[] | null = null;
  let inItem = false;
  let afterBlank = false;
  for (const line of markdown.split("\n")) {
    if (!line.trim()) {
      afterBlank = true;
      continue;
    }
    if (SECTION_LINE.test(line)) {
      heading = line.trim();
      current = null;
      afterBlank = false;
      continue;
    }
    const startsItem = LIST_ITEM.test(line);
    const nested = inItem && /^(\s{2,}|\t)/.test(line);
    if (current && (nested || (!startsItem && !afterBlank))) {
      if (afterBlank) current.push("");
      current.push(line);
    } else {
      current = [line];
      inItem = startsItem;
      blocks.push({ heading, lines: current });
    }
    afterBlank = false;
  }
  return blocks.map((block) => {
    const text = block.lines.join("\n");
    return { heading: block.heading, text, hash: blockHash(text) };
  });
}

/** Block hashes per retro, chosen by a reading pass; the file lives in private Notes. */
export type Curation = {
  /** The only blocks a retro shows, keyed by retroKey. Empty: nothing worth rereading. */
  retroPicks: Record<string, string[]>;
};

export const retroKey = (rel: string) => rel.split("/Weekly Retros/").pop() ?? rel;

/** A retro nobody has picked through yet shows its Learnings, minus the one-liners. */
const UNPICKED_SECTION = /learning/i;
const UNPICKED_MIN_WORDS = 25;

/** Stands where a retro's unpicked blocks were, so a jump never reads as continuous text. */
export const GAP = "\u22ef";

/**
 * Takes the updates, goals and time charts out of a weekly retro and leaves the
 * thinking. It only ever drops whole blocks: what stays is word for word, and
 * every stretch left out between two blocks shows as a gap.
 */
export function curateRetro(body: string, picked?: string[]): string {
  const blocks = textBlocks(body);
  const kept = (b: TextBlock) =>
    picked
      ? picked.includes(b.hash)
      : UNPICKED_SECTION.test(b.heading) && countWords(b.text) >= UNPICKED_MIN_WORDS;
  const showHeadings = new Set(blocks.filter(kept).map((b) => b.heading)).size > 1;
  const shown: string[] = [];
  let last = "";
  let skipped = false;
  blocks.forEach((block) => {
    if (!kept(block)) {
      skipped = true;
      return;
    }
    if (skipped && shown.length > 0) shown.push(GAP);
    skipped = false;
    if (showHeadings && block.heading && block.heading !== last) shown.push(block.heading);
    last = block.heading;
    shown.push(block.text);
  });
  return shown.join("\n\n");
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
  /** The whole file's words where the page shows only a selection of it. */
  fullWords: number | null;
  body: string;
  part: { index: number; count: number } | null;
};

export type DiaryFile = { rel: string; path: string; title?: unknown; content: string };

const fingerprint = (text: string) =>
  (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).slice(0, 6).join("-");

export function buildEntries(
  files: DiaryFile[],
  curation: Curation = { retroPicks: {} },
): DiaryEntry[] {
  const entries: DiaryEntry[] = [];
  for (const file of files) {
    const kind = kindOf(file.rel);
    if (!kind) continue;
    const cleaned = cleanBody(file.content);
    const title = entryTitle(file.rel, kind, file.title, cleaned);
    // The page shows the title above the text; a heading that repeats it goes.
    const whole = cleaned.replace(/^#{1,3}\s+(.+)\n*/, (line, text: string) =>
      text.trim() === title ? "" : line,
    );
    const body =
      kind === "retro" ? curateRetro(whole, curation.retroPicks[retroKey(file.rel)]) : whole;
    if (countWords(body) < MIN_WORDS) continue;
    const fullWords = body === whole ? null : countWords(whole);
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
        fullWords,
        body: part,
        part: parts.length > 1 ? { index: index + 1, count: parts.length } : null,
      });
    });
  }
  return entries;
}

/** Which entries were read or skipped on which day. Lives with the texts, in private Notes. */
export const DIARY_LOG_FILE = "diary-progress.json";

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

/** Deterministic number in (0, 1) per string. */
const unit = (text: string) => (fnv1a(text) + 0.5) / 2 ** 32;

const monthYear = (day: string) =>
  new Date(noon(day)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

export type Candidate = { entry: DiaryEntry; reason: string };

/**
 * Today's reading order: a weighted shuffle, the same all day, so reloading
 * the page does not change the pick. Entries from this week in earlier years
 * weigh most, older entries more than recent ones, and anything read in the
 * last year sits out. A long text is one item: its unread parts stay in file
 * order, and a text already started comes first, so no part ever arrives
 * without the ones before it.
 */
export function dailyOrder(entries: DiaryEntry[], log: DiaryLog, today: string): Candidate[] {
  const lastRead = new Map<string, string>();
  for (const e of log.events) {
    if (e.action !== "read" || e.day >= today) continue;
    if ((lastRead.get(e.id) ?? "") < e.day) lastRead.set(e.id, e.day);
  }
  const resting = (id: string) => {
    const read = lastRead.get(id);
    return read !== undefined && daysBetween(read, today) < REST_DAYS;
  };
  const texts = new Map<string, DiaryEntry[]>();
  for (const entry of entries) texts.set(entry.rel, [...(texts.get(entry.rel) ?? []), entry]);

  const year = Number(today.slice(0, 4));
  const ranked: { parts: Candidate[]; started: string; key: number }[] = [];
  for (const [rel, parts] of texts) {
    const unread = parts.filter((p) => !resting(p.id));
    const entry = unread[0];
    if (!entry) continue;
    const started = parts
      .filter((p) => resting(p.id))
      .reduce((latest, p) => {
        const read = lastRead.get(p.id) ?? "";
        return read > latest ? read : latest;
      }, "");
    const read = lastRead.get(entry.id);
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
    if (started) reason = "A text you started";
    ranked.push({
      parts: unread.map((part) => ({ entry: part, reason })),
      started,
      key: -Math.log(unit(`${today}|${rel}`)) / weight,
    });
  }
  return ranked
    .sort((a, b) => b.started.localeCompare(a.started) || a.key - b.key)
    .flatMap((r) => r.parts);
}

/**
 * The first entry in today's order not yet read or skipped today. Skipping a
 * part sets its whole text aside for the day, because the next part would
 * start in the middle of it.
 */
export function todaysPick(order: Candidate[], log: DiaryLog, today: string): Candidate | null {
  const events = log.events.filter((e) => e.day === today);
  const handled = new Set(events.map((e) => e.id));
  const rels = (action: DiaryEvent["action"]) =>
    new Set(events.filter((e) => e.action === action).map((e) => e.id.split("#")[0]));
  const skipped = rels("skip");
  const open = order.filter((c) => !handled.has(c.entry.id) && !skipped.has(c.entry.rel));
  const reading = rels("read");
  const next = open.find((c) => reading.has(c.entry.rel));
  return next ? { ...next, reason: "A text you started" } : (open[0] ?? null);
}

export function readToday(log: DiaryLog, today: string): DiaryEvent[] {
  return log.events.filter((e) => e.day === today && e.action === "read");
}

/** Words written per day: every dated file in full, whatever the page hides of it. */
export function writtenByDay(files: DiaryFile[]): Record<string, number> {
  const written: Record<string, number> = {};
  for (const file of files) {
    const date = kindOf(file.rel) ? entryDate(file.rel) : null;
    if (date) written[date] = (written[date] ?? 0) + countWords(cleanBody(file.content));
  }
  return written;
}

export function readByDay(log: DiaryLog): Record<string, number> {
  const read: Record<string, number> = {};
  for (const e of log.events) if (e.action === "read") read[e.day] = (read[e.day] ?? 0) + e.words;
  return read;
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

export function diaryStats(
  entries: DiaryEntry[],
  log: DiaryLog,
  today: string,
  written: Record<string, number>,
): DiaryStats {
  const read = readByDay(log);
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

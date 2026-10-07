// Writing progress for the "how computers work" series: one Markdown file per
// chapter or aside in src/content/Notes/computer/, one idea per heading. Pure
// functions only; the dev page at /dev/writing does the file reading.

import { SECTION_ESTIMATES } from "./computerSeriesEstimates";
import { stripNav } from "./computerSeriesLinks";

/** The goal: every section of every chapter drafted by the deadline. */
export const SERIES_START = "2026-10-08";
export const SERIES_DEADLINE = "2026-12-31";
/**
 * Targets for a heading with no estimate in computerSeriesEstimates.ts (new or
 * renamed): a heading with sub-headings mostly frames them, a leaf carries the text.
 */
export const DEFAULT_PARENT_WORDS = 200;
export const DEFAULT_LEAF_WORDS = 500;

export type ChapterStatus = "idea" | "drafting" | "revising" | "done";

export type ChapterMeta = {
  title: string;
  /** Fixed URL slug: the chapter's page is /computer/<slug>. */
  slug?: string;
  part: number;
  partTitle: string;
  number: string;
  kind: "chapter" | "aside";
  parent?: string;
  summary?: string;
  order: number;
  status: ChapterStatus;
};

export type Section = { heading: string; depth: number; words: number; target: number };

export type ChapterProgress = ChapterMeta & {
  path: string;
  sections: Section[];
  words: number;
  target: number;
  /** Words that count towards the target: no section can make up for another. */
  credited: number;
};

/** The words a reader would read: no code, tags, comments or Markdown syntax. */
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/%%[\s\S]*?%%/g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/!?\[\[([^\]|]*\|)?([^\]]*)\]\]/g, " $2 ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, " $1 ");
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? []).length;
}

/**
 * Splits a chapter body into sections at its headings. Text before the first
 * heading is the chapter's own introduction and counts as a section too. Each
 * section's target is its estimate, or a default for a parent or leaf heading.
 */
export function splitSections(
  markdown: string,
  title: string,
  estimates: Record<string, number> = {},
): Section[] {
  const body = stripNav(markdown);
  const found: { heading: string; depth: number; lines: string[] }[] = [];
  let current = { heading: title, depth: 1, lines: [] as string[] };
  let inFence = false;
  for (const line of body.split("\n")) {
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    const match = !inFence && /^(#{1,6})\s+(.*)$/.exec(line);
    if (match) {
      found.push(current);
      current = { heading: match[2].trim(), depth: match[1].length, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  found.push(current);
  return found.map((section, i) => {
    const hasChildren = (found[i + 1]?.depth ?? 0) > section.depth;
    return {
      heading: section.heading,
      depth: section.depth,
      words: countWords(section.lines.join("\n")),
      target:
        estimates[section.heading] ?? (hasChildren ? DEFAULT_PARENT_WORDS : DEFAULT_LEAF_WORDS),
    };
  });
}

export function chapterProgress(
  meta: ChapterMeta,
  body: string,
  path: string,
  estimates: Record<string, number> = SECTION_ESTIMATES[meta.number] ?? {},
): ChapterProgress {
  const sections = splitSections(body, meta.title, estimates);
  const words = sections.reduce((sum, s) => sum + s.words, 0);
  const target = sections.reduce((sum, s) => sum + s.target, 0);
  const credited =
    meta.status === "done"
      ? target
      : sections.reduce((sum, s) => sum + Math.min(s.words, s.target), 0);
  return { ...meta, path, sections, words, target, credited };
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

export type Pace = {
  credited: number;
  target: number;
  /** Credited words a straight line from start to deadline expects by the start of today. */
  expected: number;
  /** Positive when ahead of that line, negative when behind. */
  lead: number;
  daysLeft: number;
  /** Words per day, from today on, that still meet the deadline. */
  neededPerDay: number;
};

export function pace(
  chapters: ChapterProgress[],
  today: string,
  start = SERIES_START,
  deadline = SERIES_DEADLINE,
): Pace {
  const credited = chapters.reduce((sum, c) => sum + c.credited, 0);
  const target = chapters.reduce((sum, c) => sum + c.target, 0);
  const totalDays = daysBetween(start, deadline) + 1;
  const elapsed = Math.min(Math.max(daysBetween(start, today), 0), totalDays);
  const expected = Math.round((target * elapsed) / totalDays);
  const daysLeft = Math.max(daysBetween(today, deadline) + 1, 0);
  const remaining = Math.max(target - credited, 0);
  return {
    credited,
    target,
    expected,
    lead: credited - expected,
    daysLeft,
    neededPerDay: daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining,
  };
}

export type NextUp = { chapter: ChapterProgress; section: Section };

/** The first section, in reading order, still short of its target. */
export function nextUp(chapters: ChapterProgress[]): NextUp | null {
  for (const chapter of [...chapters].sort((a, b) => a.order - b.order)) {
    if (chapter.status === "done") continue;
    const section = chapter.sections.find((s) => s.words < s.target);
    if (section) return { chapter, section };
  }
  return null;
}

/** Total words written, as last seen on each day. */
export type History = Record<string, number>;

/**
 * Saves today's total. The very first record also saves it as yesterday's, so
 * words written after the dashboard was first opened count as today's.
 */
export function recordDay(history: History, today: string, words: number): History {
  if (Object.keys(history).length === 0) {
    return { [dayKey(new Date(Date.parse(`${today}T12:00:00Z`) - DAY_MS))]: words, [today]: words };
  }
  return { ...history, [today]: words };
}

/** Words written per day: each day's total minus the last total before it. */
export function dailyWords(history: History): { day: string; words: number }[] {
  const days = Object.keys(history).sort();
  return days.slice(1).map((day, i) => ({ day, words: history[day] - history[days[i]] }));
}

/** Days in a row, ending today or yesterday, on which the word count went up. */
export function streak(history: History, today: string): number {
  const gained = new Set(
    dailyWords(history)
      .filter((d) => d.words > 0)
      .map((d) => d.day),
  );
  let day = gained.has(today) ? today : dayKey(new Date(Date.parse(`${today}T12:00:00Z`) - DAY_MS));
  let count = 0;
  while (gained.has(day)) {
    count += 1;
    day = dayKey(new Date(Date.parse(`${day}T12:00:00Z`) - DAY_MS));
  }
  return count;
}

/**
 * Fill colour for a progress bar: a dull olive at the start that turns into a
 * deep, saturated green as `fraction` approaches 1.
 */
export function progressColor(fraction: number): string {
  const t = Math.min(Math.max(fraction, 0), 1);
  const mix = (from: number, to: number) => Math.round(from + (to - from) * t);
  return `hsl(${mix(70, 145)} ${mix(35, 72)}% ${mix(55, 42)}%)`;
}

/** One cell per day for the streak grid: words written, or null outside the range or in the future. */
export type CalendarDay = { day: string; words: number | null; future: boolean; inRange: boolean };

/**
 * Days from the Monday on or before `start` to the Sunday on or after
 * `deadline`, so the grid fills whole weeks.
 */
export function calendar(
  daily: { day: string; words: number }[],
  today: string,
  start = SERIES_START,
  deadline = SERIES_DEADLINE,
): CalendarDay[] {
  const byDay = new Map(daily.map((d) => [d.day, d.words]));
  const noon = (key: string) => new Date(`${key}T12:00:00Z`);
  const first = noon(start);
  first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const last = noon(deadline);
  last.setUTCDate(last.getUTCDate() + ((7 - last.getUTCDay()) % 7));
  const days: CalendarDay[] = [];
  for (const d = first; d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    const inRange = day >= start && day <= deadline;
    const future = day > today;
    days.push({ day, inRange, future, words: inRange && !future ? (byDay.get(day) ?? 0) : null });
  }
  return days;
}

/** Longest run of consecutive days on which the word count went up. */
export function bestStreak(daily: { day: string; words: number }[]): number {
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const { day, words } of [...daily].sort((a, b) => a.day.localeCompare(b.day))) {
    const follows = previous !== null && daysBetween(previous, day) === 1;
    run = words > 0 ? (follows ? run + 1 : 1) : 0;
    best = Math.max(best, run);
    previous = day;
  }
  return best;
}

// Writing progress for the "how computers work" series: one Markdown file per
// chapter or aside in src/content/Notes/computer/, one idea per heading. Pure
// functions only; the dev page at /dev/writing does the file reading.

import { stripNav } from "./computerSeriesLinks";

/** The goal: every section of every chapter drafted by the deadline. */
export const SERIES_START = "2026-10-08";
export const SERIES_DEADLINE = "2026-12-31";
/** One heading in the outline is one idea; this is what an idea is worth. */
export const WORDS_PER_SECTION = 400;

export type ChapterStatus = "idea" | "drafting" | "revising" | "done";

export type ChapterMeta = {
  title: string;
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
 * heading is the chapter's own introduction and counts as a section too.
 */
export function splitSections(markdown: string, title: string): Section[] {
  const body = stripNav(markdown);
  const sections: Section[] = [];
  let current = { heading: title, depth: 1, lines: [] as string[] };
  let inFence = false;
  const flush = () =>
    sections.push({
      heading: current.heading,
      depth: current.depth,
      words: countWords(current.lines.join("\n")),
      target: WORDS_PER_SECTION,
    });
  for (const line of body.split("\n")) {
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    const match = !inFence && /^(#{1,6})\s+(.*)$/.exec(line);
    if (match) {
      flush();
      current = { heading: match[2].trim(), depth: match[1].length, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  flush();
  return sections;
}

export function chapterProgress(meta: ChapterMeta, body: string, path: string): ChapterProgress {
  const sections = splitSections(body, meta.title);
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

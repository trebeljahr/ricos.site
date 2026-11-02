// Writing progress for the "how computers work" series: one Markdown file per
// chapter or aside in src/content/Notes/computer/, one idea per heading. Pure
// functions only; the dev page at /dev/writing does the file reading.

import { SECTION_ESTIMATES } from "./computerSeriesEstimates";
import { stripNav } from "./computerSeriesLinks";

export const SERIES_START = "2026-10-08";
/** New words a day, while there is something to draft. The deadline counts steps instead. */
export const DAILY_GOAL = 1000;

export type PartDeadline = {
  part: number;
  date: string;
  /** Where the straight line to `date` starts: the day it was set and the steps done by then. */
  start: string;
  stepsAtStart: number;
};

/**
 * The goal: one part at a time, polished and live by its own date. Only the next
 * part has a date; set the following one here when this one ships. The date is
 * private to this dashboard: readers get a chapter when it is ready.
 */
export const NEXT_DEADLINE: PartDeadline = {
  part: 1,
  date: "2026-11-30",
  start: "2026-11-02",
  stepsAtStart: 2,
};

/**
 * Targets for a heading with no estimate in computerSeriesEstimates.ts (new or
 * renamed): a heading with sub-headings mostly frames them, a leaf carries the text.
 */
export const DEFAULT_PARENT_WORDS = 200;
export const DEFAULT_LEAF_WORDS = 500;
/** A folded box stays short, or it wants to be a page of its own. */
export const DEFAULT_BOX_WORDS = 300;

/** The first line of a folded box, the one kind of callout written as a section. */
const BOX_OPEN = /^>\s*\[!more\]-\s*(.*)$/;

export type ChapterStatus = "idea" | "drafting" | "draft-done" | "revising" | "done";

/** Every status from "draft-done" on counts as drafted. */
const DRAFTED: ChapterStatus[] = ["draft-done", "revising", "done"];
export const isDrafted = (status: ChapterStatus) => DRAFTED.includes(status);
/**
 * A drafted section that stayed short of its estimate takes its own word
 * count, rounded down to a multiple of this, as its target.
 */
export const LOCK_STEP = 50;

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
  published?: boolean;
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

type Draft = { heading: string; lines: string[] };

/**
 * Splits a chapter body into sections at its headings. Text before the first
 * heading is the chapter's own introduction and counts as a section too. So
 * does a folded box, right after the section it sits in. Each section's target
 * is its estimate, or a default for a box, a parent or a leaf heading.
 */
export function splitSections(
  markdown: string,
  title: string,
  estimates: Record<string, number> = {},
): Section[] {
  const body = stripNav(markdown);
  const found: { heading: string; depth: number; lines: string[]; boxes: Draft[] }[] = [];
  let current = { heading: title, depth: 1, lines: [] as string[], boxes: [] as Draft[] };
  let box: Draft | undefined;
  let inFence = false;
  for (const line of body.split("\n")) {
    if (box && line.startsWith(">")) {
      box.lines.push(line);
      continue;
    }
    box = undefined;
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    const boxOpen = !inFence && BOX_OPEN.exec(line);
    if (boxOpen) {
      box = { heading: boxOpen[1].trim(), lines: [] };
      current.boxes.push(box);
      continue;
    }
    const match = !inFence && /^(#{1,6})\s+(.*)$/.exec(line);
    if (match) {
      found.push(current);
      current = { heading: match[2].trim(), depth: match[1].length, lines: [], boxes: [] };
    } else {
      current.lines.push(line);
    }
  }
  found.push(current);
  return found.flatMap((section, i) => {
    const hasChildren = (found[i + 1]?.depth ?? 0) > section.depth;
    return [
      {
        heading: section.heading,
        depth: section.depth,
        words: countWords(section.lines.join("\n")),
        target:
          estimates[section.heading] ?? (hasChildren ? DEFAULT_PARENT_WORDS : DEFAULT_LEAF_WORDS),
      },
      ...section.boxes.map(({ heading, lines }) => ({
        heading,
        depth: section.depth,
        words: countWords(lines.join("\n")),
        target: estimates[heading] ?? DEFAULT_BOX_WORDS,
      })),
    ];
  });
}

export function chapterProgress(
  meta: ChapterMeta,
  body: string,
  path: string,
  estimates: Record<string, number> = SECTION_ESTIMATES[meta.number] ?? {},
): ChapterProgress {
  const estimated = splitSections(body, meta.title, estimates);
  // Once the draft is done, what a section got is what it needed: its target
  // drops to the words written, so every section of the chapter is complete.
  const sections = isDrafted(meta.status)
    ? estimated.map((s) => ({
        ...s,
        target: Math.min(s.target, Math.floor(s.words / LOCK_STEP) * LOCK_STEP),
      }))
    : estimated;
  const words = sections.reduce((sum, s) => sum + s.words, 0);
  const target = sections.reduce((sum, s) => sum + s.target, 0);
  const credited = sections.reduce((sum, s) => sum + Math.min(s.words, s.target), 0);
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

/** What a chapter goes through before readers get it, in order. */
export const STEPS = ["drafted", "polished", "live"] as const;
export type Step = (typeof STEPS)[number];

export function stepDone(chapter: Pick<ChapterMeta, "status" | "published">, step: Step) {
  if (step === "drafted") return isDrafted(chapter.status);
  if (step === "polished") return chapter.status === "done";
  return Boolean(chapter.published);
}

/** What a part's deadline covers: a part ships without its asides. */
export const partChapters = <T extends Pick<ChapterMeta, "part" | "kind">>(
  chapters: T[],
  part: number,
) => chapters.filter((c) => c.part === part && c.kind === "chapter");

export type PartPace = {
  stepsDone: number;
  stepsTotal: number;
  /** Steps a straight line from the deadline's start to its date expects by the start of today. */
  expected: number;
  /** Positive when ahead of that line, negative when behind. */
  lead: number;
  daysLeft: number;
  /** Steps per week, from today on, that still meet the deadline. */
  neededPerWeek: number;
  /** Words the part's chapters are still short of their targets. */
  wordsLeft: number;
};

export function partPace(
  chapters: ChapterProgress[],
  today: string,
  deadline = NEXT_DEADLINE,
): PartPace {
  const stepsTotal = chapters.length * STEPS.length;
  const stepsDone = chapters.reduce(
    (sum, c) => sum + STEPS.filter((step) => stepDone(c, step)).length,
    0,
  );
  const totalDays = daysBetween(deadline.start, deadline.date) + 1;
  const elapsed = Math.min(Math.max(daysBetween(deadline.start, today), 0), totalDays);
  const expected =
    deadline.stepsAtStart + ((stepsTotal - deadline.stepsAtStart) * elapsed) / totalDays;
  const daysLeft = Math.max(daysBetween(today, deadline.date) + 1, 0);
  const stepsLeft = stepsTotal - stepsDone;
  return {
    stepsDone,
    stepsTotal,
    expected,
    lead: stepsDone - expected,
    daysLeft,
    neededPerWeek: daysLeft > 0 ? Math.ceil((stepsLeft * 70) / daysLeft) / 10 : stepsLeft,
    wordsLeft: chapters.reduce((sum, c) => sum + Math.max(c.target - c.credited, 0), 0),
  };
}

export type Tally = { count: number; credited: number; target: number };

/**
 * Chapters and asides counted apart. Asides are written last, so a part whose
 * chapters are drafted is where it should be, whatever its asides say.
 */
export function tallyByKind(
  chapters: Pick<ChapterProgress, "kind" | "credited" | "target">[],
): Record<ChapterMeta["kind"], Tally> {
  const tally = (kind: ChapterMeta["kind"]): Tally => {
    const ofKind = chapters.filter((c) => c.kind === kind);
    return {
      count: ofKind.length,
      credited: ofKind.reduce((sum, c) => sum + c.credited, 0),
      target: ofKind.reduce((sum, c) => sum + c.target, 0),
    };
  };
  return { chapter: tally("chapter"), aside: tally("aside") };
}

export type NextStep = {
  step: Step;
  chapter: ChapterProgress;
  /** While drafting: the first section still short of its target. */
  section?: Section;
};

/**
 * The order to write in: every chapter in reading order, then the asides in
 * reading order. An aside is optional reading, so none is due before the last
 * chapter has its draft.
 */
export function writingOrder<T extends Pick<ChapterMeta, "kind" | "order">>(chapters: T[]): T[] {
  const rank = (c: T) => (c.kind === "aside" ? 1 : 0);
  return [...chapters].sort((a, b) => rank(a) - rank(b) || a.order - b.order);
}

/** What to do next: every draft first, then every polish, then each chapter live. */
export function nextStep(chapters: ChapterProgress[]): NextStep | null {
  const ordered = writingOrder(chapters);
  for (const step of STEPS) {
    const chapter = ordered.find((c) => !stepDone(c, step));
    if (!chapter) continue;
    const section =
      step === "drafted" ? chapter.sections.find((s) => s.words < s.target) : undefined;
    // getStaticProps refuses an undefined value, so the key stays out.
    return section ? { step, chapter, section } : { step, chapter };
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
 * Days from the Monday on or before `start` to the Sunday on or after `end`,
 * so the grid fills whole weeks.
 */
export function calendar(
  daily: { day: string; words: number }[],
  today: string,
  start: string,
  end: string,
): CalendarDay[] {
  const byDay = new Map(daily.map((d) => [d.day, d.words]));
  const noon = (key: string) => new Date(`${key}T12:00:00Z`);
  const first = noon(start);
  first.setUTCDate(first.getUTCDate() - ((first.getUTCDay() + 6) % 7));
  const last = noon(end);
  last.setUTCDate(last.getUTCDate() + ((7 - last.getUTCDay()) % 7));
  const days: CalendarDay[] = [];
  for (const d = first; d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.toISOString().slice(0, 10);
    const inRange = day >= start && day <= end;
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

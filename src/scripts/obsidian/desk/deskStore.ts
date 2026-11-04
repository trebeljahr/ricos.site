// Data behind the Desk plugin: the same files and pure functions as /dev/writing
// and /dev/diary, read through the vault, so it runs on a phone with no server.
// Nothing in the plugin talks to the network. Obsidian's API stays behind DeskIO,
// which keeps this file testable and free of Obsidian imports.

import {
  bestStreak,
  type CalendarDay,
  type ChapterMeta,
  type ChapterProgress,
  calendar,
  chapterProgress,
  countWords,
  dailyWords,
  dayKey,
  type History,
  NEXT_DEADLINE,
  type NextStep,
  nextStep,
  type PartPace,
  partChapters,
  partPace,
  recordDay,
  SERIES_START,
  streak,
} from "src/lib/computerSeries";
import { CHAPTER_FILE } from "src/lib/computerSeriesLinks";
import {
  buildEntries,
  type Candidate,
  type Curation,
  cleanBody,
  DIARY_LOG_FILE,
  type DiaryEntry,
  type DiaryFile,
  type DiaryLog,
  type DiaryStats,
  dailyOrder,
  diaryStats,
  entryDate,
  entryTitle,
  kindOf,
  morningPageRel,
  readByDay,
  readToday,
  todaysPick,
  writtenByDay,
} from "src/lib/diary";
import { EMPTY_BOOK, type MarkBook, pileDraft, slugify } from "src/lib/diaryMarks";
import { buildIndex, type NotesIndex, passagesOf, SEARCHED_FOLDERS } from "src/lib/notesSearch";

export type DeskIO = {
  /** Every Markdown file in the vault, by path from its root. */
  markdownFiles(): string[];
  read(rel: string): Promise<string>;
  /** Files directly in a folder, by path from the vault root. */
  listFolder(folder: string): Promise<string[]>;
  /** Parsed JSON, or the fallback when the file does not exist. Throws on a damaged file. */
  readJson<T>(rel: string, fallback: T): Promise<T>;
  writeJson(rel: string, value: unknown): Promise<void>;
  /** False when the file already exists. */
  createNote(rel: string, content: string): Promise<boolean>;
  parseYaml(yaml: string): unknown;
  deviceId(): string;
};

export const MARKS_REL = "texts/diary-marks.json";
export const LOG_REL = `texts/${DIARY_LOG_FILE}`;
const PICKS_REL = "texts/diary-retro-picks.json";
const WORDS_PREFIX = "texts/desk-words-";
/** The history /dev/writing had collected before Desk existed; written once by the installer. */
export const WORDS_SEED_REL = `${WORDS_PREFIX}seed.json`;

/** Splits YAML frontmatter from a note, the part gray-matter does on the site. */
export function splitFrontmatter(
  text: string,
  parseYaml: DeskIO["parseYaml"],
): { data: Record<string, unknown>; content: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n?---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!match) return { data: {}, content: text };
  const data = parseYaml(match[1]);
  return {
    data: data && typeof data === "object" ? (data as Record<string, unknown>) : {},
    content: text.slice(match[0].length),
  };
}

/** Reads, changes and writes a JSON file in one go, so a stale copy never overwrites a newer one. */
export async function updateJson<T>(
  io: DeskIO,
  rel: string,
  fallback: T,
  change: (value: T) => T,
): Promise<T> {
  const before = await io.readJson(rel, fallback);
  const after = change(before);
  if (after !== before) await io.writeJson(rel, after);
  return after;
}

/**
 * One word total per day and per device. Each device writes only its own file, so
 * Obsidian Sync never has two versions of one file to choose between.
 */
export type WordLog = Record<string, { words: number; at: number }>;

/** Every device's log into one history: for each day, the total seen last. */
export function mergeWordLogs(logs: WordLog[]): WordLog {
  const merged: WordLog = {};
  for (const log of logs) {
    for (const [day, record] of Object.entries(log)) {
      if (!merged[day] || record.at >= merged[day].at) merged[day] = record;
    }
  }
  return merged;
}

export const toHistory = (log: WordLog): History =>
  Object.fromEntries(Object.entries(log).map(([day, record]) => [day, record.words]));

/** Converts /dev/writing's history into a word log older than anything a device records. */
export const seedFromHistory = (history: History): WordLog =>
  Object.fromEntries(Object.entries(history).map(([day, words]) => [day, { words, at: 0 }]));

export type StreakWarning = { urgent: boolean; text: string };

/** From this hour on, an open streak shows as urgent. */
const URGENT_HOUR = 18;

/** Says so when a running streak ends tonight unless something happens today. */
export function streakWarning(
  days: number,
  doneToday: boolean,
  hour: number,
  action: string,
): StreakWarning | null {
  if (doneToday || days === 0) return null;
  return {
    urgent: hour >= URGENT_HOUR,
    text: `Your ${days}-day streak ends tonight. ${action} to keep it.`,
  };
}

/** Days in a row, ending today or yesterday, that are in `done`. */
export function runOfDays(done: Set<string>, today: string): number {
  const before = (day: string) =>
    new Date(Date.parse(`${day}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  let day = done.has(today) ? today : before(today);
  let count = 0;
  while (done.has(day)) {
    count += 1;
    day = before(day);
  }
  return count;
}

export type WritingData = {
  todayKey: string;
  chapters: ChapterProgress[];
  partName: string;
  pace: PartPace;
  next: NextStep | null;
  today: number;
  streak: number;
  best: number;
  days: CalendarDay[];
  warning: StreakWarning | null;
};

async function readChapters(io: DeskIO): Promise<ChapterProgress[]> {
  const rels = io
    .markdownFiles()
    .filter(
      (rel) => rel.startsWith("computer/") && CHAPTER_FILE.test(rel.slice("computer/".length)),
    );
  const chapters = await Promise.all(
    rels.map(async (rel) => {
      const { data, content } = splitFrontmatter(await io.read(rel), io.parseYaml);
      return chapterProgress(data as ChapterMeta, content, rel);
    }),
  );
  return chapters.sort((a, b) => a.order - b.order);
}

async function readWordLogs(io: DeskIO): Promise<WordLog[]> {
  const files = (await io.listFolder("texts")).filter(
    (rel) => rel.startsWith(WORDS_PREFIX) && rel.endsWith(".json"),
  );
  return Promise.all(files.map((rel) => io.readJson<WordLog>(rel, {})));
}

export async function loadWriting(io: DeskIO, now = new Date()): Promise<WritingData> {
  const chapters = await readChapters(io);
  const todayKey = dayKey(now);
  const total = chapters.reduce((sum, c) => sum + c.words, 0);
  const merged = mergeWordLogs(await readWordLogs(io));

  let history = toHistory(merged);
  if (chapters.length > 0) {
    const recorded = recordDay(history, todayKey, total);
    const ownRel = `${WORDS_PREFIX}${io.deviceId()}.json`;
    if (merged[todayKey]?.words !== total) {
      const own = await io.readJson<WordLog>(ownRel, {});
      const stamp = { ...own, [todayKey]: { words: total, at: now.getTime() } };
      // The very first record also saves yesterday, as recordDay does.
      for (const [day, words] of Object.entries(recorded)) {
        if (!merged[day] && !stamp[day]) stamp[day] = { words, at: now.getTime() };
      }
      await io.writeJson(ownRel, stamp);
    }
    history = recorded;
  }

  const daily = dailyWords(history);
  const today = daily.find((d) => d.day === todayKey)?.words ?? 0;
  const days = streak(history, todayKey);
  const scope = partChapters(chapters, NEXT_DEADLINE.part);
  return {
    todayKey,
    chapters,
    partName: `Part ${NEXT_DEADLINE.part}${scope[0] ? `: ${scope[0].partTitle}` : ""}`,
    pace: partPace(scope, todayKey),
    next: nextStep(scope),
    today,
    streak: days,
    best: bestStreak(daily),
    days: calendar(
      daily,
      todayKey,
      SERIES_START,
      todayKey > NEXT_DEADLINE.date ? todayKey : NEXT_DEADLINE.date,
    ),
    warning: streakWarning(days, today > 0, now.getHours(), "Write one new word"),
  };
}

export const WEEKS = 16;

export type DiaryData = {
  todayKey: string;
  entries: DiaryEntry[];
  morning: { rel: string; words: number | null };
  pick: Candidate | null;
  read: { id: string; title: string; words: number }[];
  stats: DiaryStats;
  wrote: CalendarDay[];
  readDays: CalendarDay[];
  readStreak: number;
  warning: StreakWarning | null;
};

const textsRel = (rel: string) => rel.slice("texts/".length);

async function readDiaryFiles(io: DeskIO): Promise<DiaryFile[]> {
  const rels = io
    .markdownFiles()
    .filter((rel) => rel.startsWith("texts/") && kindOf(textsRel(rel)) !== null);
  const files = await Promise.all(
    rels.map(async (rel): Promise<DiaryFile[]> => {
      try {
        const { data, content } = splitFrontmatter(await io.read(rel), io.parseYaml);
        return [{ rel: textsRel(rel), path: rel, title: data.title, content }];
      } catch (error) {
        console.warn(`Desk could not read ${rel}:`, error);
        return [];
      }
    }),
  );
  return files.flat();
}

export async function loadDiary(io: DeskIO, now = new Date()): Promise<DiaryData> {
  const todayKey = dayKey(now);
  const [files, picks, log] = await Promise.all([
    readDiaryFiles(io),
    io.readJson<Curation["retroPicks"]>(PICKS_REL, {}),
    io.readJson<DiaryLog>(LOG_REL, { events: [] }),
  ]);
  const entries = buildEntries(files, { retroPicks: picks });
  const written = writtenByDay(files);
  const read = readByDay(log);
  const daily = (byDay: Record<string, number>) =>
    Object.entries(byDay).map(([day, words]) => ({ day, words }));
  const start = new Date(Date.parse(`${todayKey}T12:00:00Z`) - (WEEKS * 7 - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const readDays = new Set(
    Object.entries(read)
      .filter(([, words]) => words > 0)
      .map(([day]) => day),
  );
  const readStreak = runOfDays(readDays, todayKey);

  const morningRel = `texts/${morningPageRel(todayKey)}`;
  const morningFile = files.find((f) => f.path === morningRel);
  return {
    todayKey,
    entries,
    morning: {
      rel: morningRel,
      words: morningFile ? countWords(cleanBody(morningFile.content)) : null,
    },
    pick: todaysPick(dailyOrder(entries, log, todayKey), log, todayKey),
    read: readToday(log, todayKey).map((e) => ({
      id: e.id,
      // A part's id goes stale when its text is edited; its file still names it.
      title: byId.get(e.id)?.title ?? entries.find((x) => e.id.startsWith(x.rel))?.title ?? e.id,
      words: e.words,
    })),
    stats: diaryStats(entries, log, todayKey, written),
    wrote: calendar(daily(written), todayKey, start, todayKey),
    readDays: calendar(daily(read), todayKey, start, todayKey),
    readStreak,
    warning: streakWarning(readStreak, readDays.has(todayKey), now.getHours(), "Read one entry"),
  };
}

export const readBook = async (io: DeskIO): Promise<MarkBook> => {
  const book = await io.readJson<MarkBook>(MARKS_REL, EMPTY_BOOK);
  return Array.isArray(book.marks) && Array.isArray(book.piles) ? book : EMPTY_BOOK;
};

export type WholeText = { rel: string; title: string; date: string | null; body: string };

export async function readWholeText(io: DeskIO, rel: string): Promise<WholeText> {
  const { data, content } = splitFrontmatter(await io.read(rel), io.parseYaml);
  const body = cleanBody(content);
  return {
    rel,
    title: entryTitle(rel, kindOf(rel.replace(/^texts\//, "")) ?? "essay", data.title, body),
    date: entryDate(rel),
    body,
  };
}

/** Builds the search index in small steps, so a phone stays responsive while it runs. */
export async function buildNotesIndex(io: DeskIO): Promise<NotesIndex> {
  const rels = io
    .markdownFiles()
    .filter(
      (rel) =>
        SEARCHED_FOLDERS.some((folder) => rel.startsWith(`${folder}/`)) &&
        !(rel.split("/").pop() ?? "").startsWith("_"),
    );
  const passages: NotesIndex["passages"] = [];
  for (let at = 0; at < rels.length; at += 40) {
    const batch = await Promise.all(
      rels.slice(at, at + 40).map(async (rel) => {
        try {
          const { data, content } = splitFrontmatter(await io.read(rel), io.parseYaml);
          return passagesOf({ rel, title: data.title, content });
        } catch (error) {
          console.warn(`Desk could not index ${rel}:`, error);
          return [];
        }
      }),
    );
    passages.push(...batch.flat());
    await new Promise((resolve) => setTimeout(resolve));
  }
  return buildIndex(passages);
}

/** Writes a pile to a new file under texts/drafts. Never touches an existing draft. */
export async function writeDraft(io: DeskIO, book: MarkBook, pile: string): Promise<string> {
  const slug = slugify(pile);
  for (let n = 1; ; n++) {
    const rel = `texts/drafts/${n === 1 ? `${slug}.md` : `${slug}-${n}.md`}`;
    if (await io.createNote(rel, pileDraft(book, pile))) return rel;
  }
}

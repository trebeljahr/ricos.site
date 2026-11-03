// Server side of the diary desk: reads everything under private Notes for
// search and whole-text reading, and keeps the mark book. Server-only (node:fs),
// and every caller checks servesPrivateNotes() first; see diaryStore.ts.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { cleanBody, entryDate, entryTitle, kindOf } from "./diary";
import { EMPTY_BOOK, type MarkBook, pileDraft, slugify } from "./diaryMarks";
import { textsDir } from "./diaryStore";
import {
  buildIndex,
  type NoteFile,
  type NotesIndex,
  passagesOf,
  SEARCHED_FOLDERS,
} from "./notesSearch";

export const MARKS_FILE = "diary-marks.json";
const DRAFTS_DIR = "drafts";

export const notesDir = () => path.dirname(path.resolve(textsDir()));

const isNote = (file: string) => /\.mdx?$/.test(file) && !path.basename(file).startsWith("_");

function noteFiles(): { rel: string; mtime: number }[] {
  const root = notesDir();
  return SEARCHED_FOLDERS.flatMap((folder) => {
    const dir = path.join(root, folder);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter(isNote)
      .map((file) => {
        const rel = `${folder}/${file.split(path.sep).join("/")}`;
        return { rel, mtime: fs.statSync(path.join(root, rel)).mtimeMs };
      });
  });
}

function readNote(rel: string): NoteFile | null {
  try {
    const { data, content } = matter(fs.readFileSync(path.join(notesDir(), rel), "utf8"));
    return { rel, title: data.title, content };
  } catch (error) {
    console.warn(`Could not read ${rel}:`, error);
    return null;
  }
}

let cached: { signature: string; index: NotesIndex } | null = null;

/** The search index; rebuilt only when a file under Notes changed. */
export function notesIndex(): NotesIndex {
  const files = noteFiles();
  const signature = `${notesDir()}|${files.length}|${Math.max(0, ...files.map((f) => f.mtime))}`;
  if (cached?.signature === signature) return cached.index;
  const passages = files.flatMap((file) => {
    const note = readNote(file.rel);
    return note ? passagesOf(note) : [];
  });
  cached = { signature, index: buildIndex(passages) };
  return cached.index;
}

export type WholeText = {
  rel: string;
  path: string;
  title: string;
  date: string | null;
  body: string;
};

/** One file in full. Null for anything outside Notes or that is not a note. */
export function readWholeText(rel: string): WholeText | null {
  const root = notesDir();
  const full = path.resolve(root, rel);
  if (!full.startsWith(root + path.sep) || !isNote(full)) return null;
  const note = readNote(rel);
  if (!note) return null;
  const body = cleanBody(note.content);
  const textsRel = rel.replace(/^texts\//, "");
  return {
    rel,
    path: full,
    title: entryTitle(rel, kindOf(textsRel) ?? "essay", note.title, body),
    date: entryDate(rel),
    body,
  };
}

const marksFile = () => path.join(textsDir(), MARKS_FILE);

export function readMarks(): MarkBook {
  try {
    const book = JSON.parse(fs.readFileSync(marksFile(), "utf8")) as MarkBook;
    return Array.isArray(book.marks) && Array.isArray(book.piles) ? book : EMPTY_BOOK;
  } catch {
    return EMPTY_BOOK;
  }
}

export function writeMarks(book: MarkBook): void {
  fs.writeFileSync(marksFile(), `${JSON.stringify(book, undefined, 2)}\n`);
}

/** Writes a pile to a new file under texts/drafts. Never touches an existing draft. */
export function writeDraft(book: MarkBook, pile: string): string {
  const dir = path.join(textsDir(), DRAFTS_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const slug = slugify(pile);
  for (let n = 1; ; n++) {
    const full = path.resolve(dir, n === 1 ? `${slug}.md` : `${slug}-${n}.md`);
    try {
      fs.writeFileSync(full, pileDraft(book, pile), { flag: "wx" });
      return full;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
}

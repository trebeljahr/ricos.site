// Search across everything in private Notes, down to the passage: diaries and
// morning pages, essays, ideas, booknotes, posts. Keyword ranking (BM25) can be
// fused with a nearest-by-meaning list, so "envy" also finds "jealous"; that
// list comes from a local model (notesVectors.ts), so no text leaves this
// machine. Pure functions; notesStore.ts reads the files.

import { cleanBody, entryDate, type TextBlock, textBlocks } from "./diary";

export type Passage = {
  /** Path under Notes/. */
  rel: string;
  source: string;
  title: string;
  date: string | null;
  heading: string;
  text: string;
  /** Found by meaning alone, without sharing a searched word. */
  viaMeaning?: boolean;
};

export type NoteFile = { rel: string; title: unknown; content: string };

const SOURCE: Record<string, string> = {
  "texts/diary-entries": "Diary",
  "texts/morning-pages": "Morning pages",
  "texts/notion": "Retros and Notion",
  "texts/dreams": "Dreams",
  "texts/essays": "Essays",
  "texts/ideas": "Ideas",
  "texts/misc": "Misc",
  "texts/content-notes": "Content notes",
  "texts/project-notes": "Project notes",
  "texts/book-drafts": "Book drafts",
  "texts/todo-lists": "To-do lists",
  "texts/drafts": "Drafts",
  booknotes: "Booknotes",
  podcastnotes: "Podcast notes",
  posts: "Posts",
  newsletters: "Newsletters",
  travel: "Travel",
  pages: "Pages",
  computer: "Computer series",
};

export function sourceOf(rel: string): string {
  const [top, second] = rel.split("/");
  return SOURCE[`${top}/${second}`] ?? SOURCE[top] ?? top;
}

/** Folders of Notes/ worth searching; the rest are assets and site data. */
export const SEARCHED_FOLDERS = ["texts", ...Object.keys(SOURCE).filter((k) => !k.includes("/"))];

const wordsIn = (text: string) => text.split(/\s+/).filter(Boolean).length;

export const passageWords = (passage: Passage) => wordsIn(passage.text);

/** A passage longer than this is cut at sentence ends into chunks of about CHUNK_WORDS. */
const PASSAGE_MAX = 180;
const CHUNK_WORDS = 130;

function chunks(text: string): string[] {
  if (wordsIn(text) <= PASSAGE_MAX) return [text];
  const sentences = text.match(/[^.!?\n]+(?:[.!?]+["'”’)]*\s*|\n+|$)/g) ?? [text];
  const out: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    current += sentence;
    if (wordsIn(current) >= CHUNK_WORDS) {
      out.push(current.trim());
      current = "";
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

export function passagesOf(file: NoteFile): Passage[] {
  const body = cleanBody(file.content);
  const name = (file.rel.split("/").pop() ?? file.rel).replace(/\.mdx?$/, "");
  const title = typeof file.title === "string" && file.title.trim() ? file.title.trim() : name;
  const base = {
    rel: file.rel,
    source: sourceOf(file.rel),
    title,
    date: entryDate(file.rel),
  };
  return textBlocks(body).flatMap((block: TextBlock) =>
    chunks(block.text).map((text) => ({ ...base, heading: block.heading, text })),
  );
}

const STOP = new Set(
  (
    "a about after again all also am an and any are as at be because been before being but by can could did do does doing done for from get got had has have having he her here him his how i if in into is it its just like me more most my no not now of on one only or other our out over really she so some still such than that the their them then there these they thing things this those through to too up us very was way we were what when where which while who why will with would you your " +
    "aber alle als also am an auch auf aus bei bin bis da das dass dem den der des die doch du ein eine einen einer er es für hat ich ihr im in ist ja kann man mein mich mir mit nach nicht noch nur oder sich sie sind so und von war was wenn wie wir zu zum zur"
  ).split(" "),
);

/** Folds plurals and common verb endings, so "dreaming" also finds "dreams". */
function stem(word: string): string {
  if (word.length <= 4) return word;
  return word.replace(/(?:ings?|edly|ed|ies|es|s|ly)$/, "") || word;
}

export function tokenize(text: string): string[] {
  const plain = text
    .replace(/\]\([^)]*\)/g, "] ")
    .replace(/https?:\/\/\S+/g, " ")
    .toLowerCase();
  return (plain.match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => !STOP.has(word) && word.length > 1)
    .map(stem);
}

export type NotesIndex = {
  passages: Passage[];
  postings: Map<string, { at: number; count: number }[]>;
  lengths: number[];
  averageLength: number;
};

export function buildIndex(passages: Passage[]): NotesIndex {
  const postings: NotesIndex["postings"] = new Map();
  const lengths: number[] = [];
  passages.forEach((passage, at) => {
    const tokens = tokenize(`${passage.title} ${passage.heading} ${passage.text}`);
    lengths.push(tokens.length);
    const counts = new Map<string, number>();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    for (const [token, count] of counts) {
      const list = postings.get(token);
      if (list) list.push({ at, count });
      else postings.set(token, [{ at, count }]);
    }
  });
  const total = lengths.reduce((sum, n) => sum + n, 0);
  return { passages, postings, lengths, averageLength: total / (lengths.length || 1) };
}

const K1 = 1.2;
/** Below the usual 0.75: short to-do lines should not outrank real paragraphs. */
const B = 0.5;

const idf = (index: NotesIndex, term: string) => {
  const n = index.postings.get(term)?.length ?? 0;
  return Math.log(1 + (index.passages.length - n + 0.5) / (n + 0.5));
};

function score(index: NotesIndex, terms: string[]): Map<number, number> {
  const scores = new Map<number, number>();
  for (const term of terms) {
    const weight = idf(index, term);
    for (const { at, count } of index.postings.get(term) ?? []) {
      const norm = 1 - B + (B * index.lengths[at]) / (index.averageLength || 1);
      const add = (weight * count * (K1 + 1)) / (count + K1 * norm);
      scores.set(at, (scores.get(at) ?? 0) + add);
    }
  }
  return scores;
}

/** Normalizes a model's vector and packs it into one byte per dimension. */
export function quantize(vector: number[]): Int8Array {
  const length = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
  return Int8Array.from(vector, (v) => Math.round((v / length) * 127));
}

/** Below this, a nearest passage has little to do with the question. */
export const MIN_SIMILARITY = 0.6;

/**
 * Passage numbers closest to a query vector, best first. `slots` holds each
 * passage's offset into `data`, or -1 for a passage without a vector.
 */
export function nearest(
  store: { data: Int8Array; slots: Int32Array; dims: number },
  query: Int8Array,
  limit: number,
  minSimilarity = MIN_SIMILARITY,
): number[] {
  const { data, slots, dims } = store;
  const scored: { at: number; score: number }[] = [];
  for (let at = 0; at < slots.length; at++) {
    const offset = slots[at];
    if (offset < 0) continue;
    let dot = 0;
    for (let d = 0; d < dims; d++) dot += data[offset + d] * query[d];
    const score = dot / (127 * 127);
    if (score >= minSimilarity) scored.push({ at, score });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.at);
}

/** Reciprocal rank fusion: a passage high on either list ranks high. */
const FUSION = 60;

function fuse(lists: number[][]): number[] {
  const scores = new Map<number, number>();
  for (const list of lists) {
    list.forEach((at, rank) => {
      scores.set(at, (scores.get(at) ?? 0) + 1 / (FUSION + rank));
    });
  }
  return [...scores].sort((a, b) => b[1] - a[1]).map(([at]) => at);
}

const byScore = (scores: Map<number, number>) =>
  [...scores].sort((a, b) => b[1] - a[1]).map(([at]) => at);

export type SearchOptions = {
  source?: string;
  sort?: "rank" | "date";
  limit?: number;
  /** Passage numbers nearest by meaning, best first. */
  near?: number[];
};
export type SearchResult = { passages: Passage[]; total: number };

const squeezed = (text: string) => text.toLowerCase().replace(/\s+/g, " ");

/**
 * Passages for a query, best first or oldest first. Every word counts towards
 * the rank, and "double quotes" require those exact words in that order.
 */
export function search(
  index: NotesIndex,
  query: string,
  options: SearchOptions = {},
): SearchResult {
  const phrases = [...query.matchAll(/"([^"]+)"/g)].map((m) => squeezed(m[1]));
  const words = byScore(score(index, [...new Set(tokenize(query))]));
  const hasWord = new Set(words);
  const ranked = fuse(options.near ? [words, options.near] : [words])
    .map((at) => ({ at, passage: index.passages[at] }))
    .filter(({ passage }) => !options.source || passage.source === options.source)
    .filter(({ passage }) => {
      const text = squeezed(`${passage.heading} ${passage.text}`);
      return phrases.every((phrase) => text.includes(phrase));
    });
  const limit = options.limit ?? 60;
  // By date, the strongest matches only, so a timeline is not padded with passing mentions.
  const chosen =
    options.sort === "date"
      ? ranked
          .slice(0, 200)
          .sort((a, b) => (a.passage.date ?? "9").localeCompare(b.passage.date ?? "9"))
          .slice(0, limit)
      : ranked.slice(0, limit);
  return {
    passages: chosen.map(({ at, passage }) =>
      hasWord.has(at) ? passage : { ...passage, viaMeaning: true },
    ),
    total: ranked.length,
  };
}

const RELATED_TERMS = 14;
const MIN_RELATED_WORDS = 15;
const PER_FILE = 2;

/** Passages elsewhere that share a text's rarest words or sit near it in meaning. */
export function related(
  index: NotesIndex,
  text: string,
  rel: string,
  limit = 8,
  near?: number[],
): Passage[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) counts.set(token, (counts.get(token) ?? 0) + 1);
  const terms = [...counts]
    .map(([term, count]) => ({ term, weight: count * idf(index, term) }))
    .filter(({ term }) => index.postings.has(term))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, RELATED_TERMS)
    .map(({ term }) => term);
  const perFile = new Map<string, number>();
  const found: Passage[] = [];
  const words = byScore(score(index, terms));
  const hasWord = new Set(words);
  for (const at of fuse(near ? [words, near] : [words])) {
    const passage = index.passages[at];
    if (passage.rel === rel || wordsIn(passage.text) < MIN_RELATED_WORDS) continue;
    const seen = perFile.get(passage.rel) ?? 0;
    if (seen >= PER_FILE) continue;
    perFile.set(passage.rel, seen + 1);
    found.push(hasWord.has(at) ? passage : { ...passage, viaMeaning: true });
    if (found.length >= limit) break;
  }
  return found;
}

/** The words a query matches, as a pattern for highlighting them in rendered text. */
export function termPattern(query: string): RegExp | null {
  const terms = [...new Set(tokenize(query))].map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""));
  if (terms.length === 0) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${terms.join("|")})[\\p{L}\\p{N}]*`, "giu");
}

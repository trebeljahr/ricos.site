// Meaning search for private Notes: every passage as a vector from a model that
// runs in Ollama on this machine. The address is fixed to loopback, because the
// text must never reach another host. Vectors are derived from private writing,
// so they live outside both Git repositories, in ~/.cache/ricos-site. Server-only.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { type NotesIndex, type Passage, passageWords, quantize } from "./notesSearch";

const OLLAMA = "http://127.0.0.1:11434";
const MODEL = "nomic-embed-text";
const DIMS = 768;
/** Shorter passages have too little in them to place by meaning. */
const MIN_WORDS = 8;

const dir = () => process.env.NOTES_VECTORS_DIR ?? path.join(os.homedir(), ".cache", "ricos-site");
const keysFile = () => path.join(dir(), "notes-vectors.json");
const dataFile = () => path.join(dir(), "notes-vectors.bin");

const documentText = (p: Passage) => (p.heading ? `${p.heading}\n${p.text}` : p.text);

const keyOf = (p: Passage) => createHash("sha1").update(documentText(p)).digest("hex").slice(0, 20);

export const embeddable = (p: Passage) => passageWords(p) >= MIN_WORDS;

type Stored = { keys: string[]; data: Int8Array };

function readStored(): Stored {
  try {
    const { model, dims, keys } = JSON.parse(fs.readFileSync(keysFile(), "utf8"));
    const data = new Int8Array(fs.readFileSync(dataFile()));
    if (model !== MODEL || dims !== DIMS || data.length !== keys.length * DIMS) throw new Error();
    return { keys, data };
  } catch {
    return { keys: [], data: new Int8Array(0) };
  }
}

function writeStored({ keys, data }: Stored): void {
  fs.mkdirSync(dir(), { recursive: true, mode: 0o700 });
  // The data file first: a crash in between leaves a mismatch, which reads as empty.
  const swap = (file: string, content: string | Int8Array) => {
    fs.writeFileSync(`${file}.tmp`, content, { mode: 0o600 });
    fs.renameSync(`${file}.tmp`, file);
  };
  swap(dataFile(), data);
  swap(keysFile(), JSON.stringify({ model: MODEL, dims: DIMS, keys }));
}

async function embed(texts: string[]): Promise<number[][]> {
  const response = await fetch(`${OLLAMA}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, input: texts }),
  });
  if (!response.ok) throw new Error(`Ollama answered ${response.status}: ${await response.text()}`);
  return ((await response.json()) as { embeddings: number[][] }).embeddings;
}

/** Embeds what is new, keeps what is known and drops what no longer exists. */
export async function updateVectors(
  index: NotesIndex,
  onProgress?: (done: number, total: number) => void,
): Promise<{ added: number; total: number }> {
  const BATCH = 64;
  const SAVE_EVERY = 3200;
  const old = readStored();
  const known = new Map(old.keys.map((key, i) => [key, i]));
  const wanted = new Map<string, Passage>();
  for (const passage of index.passages) {
    if (embeddable(passage)) wanted.set(keyOf(passage), passage);
  }
  const vectors = new Map<string, Int8Array>();
  const missing: [string, Passage][] = [];
  for (const [key, passage] of wanted) {
    const at = known.get(key);
    if (at === undefined) missing.push([key, passage]);
    else vectors.set(key, old.data.subarray(at * DIMS, (at + 1) * DIMS));
  }
  const save = () => {
    const keys = [...vectors.keys()];
    const data = new Int8Array(keys.length * DIMS);
    keys.forEach((key, i) => {
      data.set(vectors.get(key) as Int8Array, i * DIMS);
    });
    writeStored({ keys, data });
  };
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH);
    const embedded = await embed(batch.map(([, p]) => `search_document: ${documentText(p)}`));
    batch.forEach(([key], j) => {
      vectors.set(key, quantize(embedded[j]));
    });
    onProgress?.(Math.min(i + BATCH, missing.length), missing.length);
    if ((i + BATCH) % SAVE_EVERY === 0) save();
  }
  save();
  return { added: missing.length, total: wanted.size };
}

export type VectorStore = {
  /** Vector data, and per passage its offset in it (-1: none yet). */
  data: Int8Array;
  slots: Int32Array;
  dims: number;
  /** Passages long enough to embed that have no vector yet: run `pnpm notes:embed`. */
  missing: number;
};

let cached: { index: NotesIndex; mtime: number; store: VectorStore } | null = null;

/** The stored vectors lined up with an index's passages. */
export function vectorStore(index: NotesIndex): VectorStore {
  let mtime = 0;
  try {
    mtime = fs.statSync(keysFile()).mtimeMs;
  } catch {}
  if (cached?.index === index && cached.mtime === mtime) return cached.store;
  const { keys, data } = readStored();
  const offsets = new Map(keys.map((key, i) => [key, i * DIMS]));
  const slots = new Int32Array(index.passages.length).fill(-1);
  let missing = 0;
  index.passages.forEach((passage, at) => {
    if (!embeddable(passage)) return;
    const offset = offsets.get(keyOf(passage));
    if (offset === undefined) missing++;
    else slots[at] = offset;
  });
  const store = { data, slots, dims: DIMS, missing };
  cached = { index, mtime, store };
  return store;
}

let lastStart = 0;

/** Ollama stops with the machine, and a search should not depend on remembering it. */
function startOllama(): void {
  if (Date.now() - lastStart < 60_000) return;
  lastStart = Date.now();
  const child = spawn("ollama", ["serve"], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, OLLAMA_HOST: "127.0.0.1:11434" },
  });
  child.on("error", (error) => console.warn("Could not start Ollama:", error));
  child.unref();
}

/** A question's vector, or null when Ollama cannot answer: search then uses words alone. */
export async function embedQuery(text: string): Promise<Int8Array | null> {
  const input = `search_query: ${text}`;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return quantize((await embed([input]))[0]);
    } catch (error) {
      const refused = (error as { cause?: { code?: string } }).cause?.code === "ECONNREFUSED";
      if (!refused) {
        console.warn("Meaning search failed:", error);
        return null;
      }
      startOllama();
      await new Promise((done) => setTimeout(done, 500));
    }
  }
  return null;
}

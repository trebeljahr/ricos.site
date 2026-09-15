import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import chokidar from "chokidar";

// Velite's own watcher (started in next.config.mjs) rebuilds .velite/*.json
// when content changes. This process turns those writes into a browser update:
// it rewrites the stamp that src/lib/loadVeliteData.ts imports, which makes
// Turbopack refetch getStaticProps in open tabs, then refreshes the outputs
// derived from content.

const VELITE_DIR = resolve(process.cwd(), ".velite");
const STAMP = resolve(VELITE_DIR, "hmr", "stamp.json");
const BACKLINKS = resolve(VELITE_DIR, "backlinks.json");
const DEBOUNCE_MS = 150;

// Not written by Velite: by next.config.mjs at startup or by flush() below.
const DERIVED_FILES = new Set(["backlinks.json", "r3f-links.json", "now-history.json"]);

let timer: NodeJS.Timeout | undefined;
let dirty = false;
let running = false;

function runScript(script: string) {
  return new Promise<void>((done) => {
    // Reuse this process's tsx loader flags instead of paying for an npx lookup.
    const child = spawn(process.execPath, [...process.execArgv, script], { stdio: "pipe" });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      console.error(`  [velite-hmr] ${script} failed:`, error);
      done();
    });
    child.on("exit", (code) => {
      if (code !== 0) console.error(`  [velite-hmr] ${script} exited ${code}\n${stderr}`);
      done();
    });
  });
}

async function readIfExists(path: string) {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

async function writeStamp() {
  await mkdir(resolve(VELITE_DIR, "hmr"), { recursive: true });
  await writeFile(STAMP, JSON.stringify({ updatedAt: Date.now() }));
}

async function flush() {
  // Stamp first so the edited page refreshes without waiting on the scripts.
  await writeStamp();
  const backlinksBefore = await readIfExists(BACKLINKS);
  await runScript("src/scripts/generateBacklinks.ts");
  // Pages read backlinks.json in getStaticProps; the search index is fetched
  // client-side from public/ and needs no stamp.
  if ((await readIfExists(BACKLINKS)) !== backlinksBefore) await writeStamp();
  await runScript("src/scripts/generateSearchIndex.ts");
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (dirty) {
      dirty = false;
      await flush();
    }
  } catch (error) {
    console.error("  [velite-hmr] flush failed:", error);
  } finally {
    running = false;
  }
}

function schedule(filePath: string) {
  const file = basename(filePath);
  if (!file.endsWith(".json") || DERIVED_FILES.has(file)) return;

  clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    dirty = true;
    drain();
  }, DEBOUNCE_MS);
}

// On a clean checkout this starts before next.config.mjs has run Velite, and
// chokidar does not pick up a watched directory created later.
await mkdir(VELITE_DIR, { recursive: true });

const watcher = chokidar.watch(VELITE_DIR, {
  depth: 0,
  ignored: (path, stats) => Boolean(stats?.isFile() && !path.endsWith(".json")),
  awaitWriteFinish: {
    pollInterval: 25,
    stabilityThreshold: 125,
  },
  ignoreInitial: true,
});

watcher.on("add", schedule);
watcher.on("change", schedule);
watcher.on("unlink", schedule);
watcher.on("error", (error) => console.error("  [velite-hmr] watcher error:", error));
watcher.on("ready", () => console.log("  [velite-hmr] watching .velite JSON"));

async function close() {
  clearTimeout(timer);
  await watcher.close();
}

process.on("SIGINT", () => {
  close().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  close().finally(() => process.exit(0));
});

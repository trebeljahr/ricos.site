import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import chokidar from "chokidar";

const VELITE_DIR = resolve(process.cwd(), ".velite");
const HMR_DIR = resolve(VELITE_DIR, "hmr");
const DEBOUNCE_MS = 75;

const timers = new Map<string, NodeJS.Timeout>();

async function writeStamp(filePath: string) {
  const file = basename(filePath);
  if (!file.endsWith(".json")) return;

  const source = resolve(VELITE_DIR, file);
  let mtimeMs = 0;
  let size = 0;
  try {
    const stats = await stat(source);
    mtimeMs = stats.mtimeMs;
    size = stats.size;
  } catch {}

  await mkdir(HMR_DIR, { recursive: true });
  await writeFile(
    resolve(HMR_DIR, file),
    JSON.stringify({ file, mtimeMs, size, updatedAt: Date.now() }),
  );
}

function schedule(filePath: string) {
  const previous = timers.get(filePath);
  if (previous) clearTimeout(previous);

  const timer = setTimeout(() => {
    timers.delete(filePath);
    writeStamp(filePath).catch((error) => {
      console.error(`  [velite-hmr] stamp failed for ${filePath}:`, error);
    });
  }, DEBOUNCE_MS);
  timers.set(filePath, timer);
}

async function seedExistingStamps() {
  try {
    await mkdir(VELITE_DIR, { recursive: true });
    const files = await readdir(VELITE_DIR);
    await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map((file) => writeStamp(resolve(VELITE_DIR, file))),
    );
  } catch {}
}

await seedExistingStamps();

const watcher = chokidar.watch(resolve(VELITE_DIR, "*.json"), {
  awaitWriteFinish: {
    pollInterval: 25,
    stabilityThreshold: 125,
  },
  ignoreInitial: false,
});

watcher.on("add", schedule);
watcher.on("change", schedule);
watcher.on("error", (error) => console.error("  [velite-hmr] watcher error:", error));
watcher.on("ready", () => console.log("  [velite-hmr] watching .velite JSON stamps"));

async function close() {
  for (const timer of timers.values()) clearTimeout(timer);
  await watcher.close();
}

process.on("SIGINT", () => {
  close().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  close().finally(() => process.exit(0));
});

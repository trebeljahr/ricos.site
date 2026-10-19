/**
 * The one way to write src/content/Notes/_data/metadata.json. Many tools write
 * it, often while another one runs: the upload scripts, syncMetadata,
 * backfillLocalMetadata, syncImageAlt, the asset watcher and /dev/alt-review.
 * Overlapping plain writes once left junk bytes after the closing brace, and
 * whole-entry replacements stripped 598 alt texts.
 *
 * Only node built-ins, so the dev watcher and API routes can import it without
 * loading AWS or CLI dependencies.
 */
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

export const assetsMetadataFilePath = path.resolve(
  process.cwd(),
  "src",
  "content",
  "Notes",
  "_data",
  "metadata.json",
);

export type AltSource = "manual" | "generated" | "ai";

export interface ImageMetadata {
  key: string;
  width: number;
  height: number;
  aspectRatio: number;
  existsInS3: boolean;
  // Written by syncImageAlt and /dev/alt-review. An update that does not
  // carry them must leave them alone.
  alt?: string;
  altSource?: AltSource;
  altReviewed?: boolean;
}

export type MetadataFile = Record<string, ImageMetadata | undefined>;

/**
 * Reads metadata.json fresh from disk. Other tools write it while scripts run,
 * so a copy loaded at startup goes stale. Throws when the file does not parse,
 * so nobody saves over a file they could not read.
 */
export async function readMetadataFile(filePath = assetsMetadataFilePath): Promise<MetadataFile> {
  let text: string;
  try {
    text = await fs.readFile(filePath, "utf-8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }

  try {
    return JSON.parse(text) as MetadataFile;
  } catch (error) {
    throw new Error(`${filePath} does not parse, not writing to it: ${error}`);
  }
}

/**
 * Every edit is a read-modify-write of one big file, so edits in this process
 * run one at a time.
 */
let writeQueue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(task, task);
  writeQueue = next.catch(() => undefined);
  return next;
}

// A lock taken over after this long even when its process still runs. An edit
// holds the lock for one read and one write, a few milliseconds.
const LOCK_STALE_MS = 30_000;
const LOCK_TIMEOUT_MS = 60_000;
const LOCK_RETRY_MS = 25;

function isRunning(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

// True when the lock is gone or was stale and is now removed: try again at once.
async function removeIfStale(lockPath: string): Promise<boolean> {
  let owner: string;
  let mtimeMs: number;
  try {
    owner = await fs.readFile(lockPath, "utf-8");
    ({ mtimeMs } = await fs.stat(lockPath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw error;
  }

  // Empty while its owner is still writing it: only age makes that stale.
  const pid = Number.parseInt(owner, 10);
  const ownerDied = pid > 0 && !isRunning(pid);
  if (!ownerDied && Date.now() - mtimeMs < LOCK_STALE_MS) return false;

  // Another waiter may have taken it over in between: remove only the lock we judged.
  if ((await fs.readFile(lockPath, "utf-8").catch(() => null)) === owner) {
    await fs.rm(lockPath, { force: true });
  }
  return true;
}

/**
 * The queue covers one process only, but the asset watcher, the dev server
 * (/dev/alt-review) and a script can save at the same time. A lock file beside
 * the target makes them take turns as well. A lock left by a process that
 * crashed, or older than LOCK_STALE_MS, is taken over.
 */
async function withFileLock<T>(filePath: string, task: () => Promise<T>): Promise<T> {
  const lockPath = `${filePath}.lock`;
  const token = `${process.pid} ${randomUUID()}\n`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  for (;;) {
    try {
      await fs.writeFile(lockPath, token, { flag: "wx" });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    if (await removeIfStale(lockPath)) continue;
    if (Date.now() > deadline) {
      throw new Error(`${lockPath} has been held for over a minute, not writing`);
    }
    await sleep(LOCK_RETRY_MS);
  }

  try {
    return await task();
  } finally {
    // After a takeover the lock belongs to someone else: leave it to them.
    if ((await fs.readFile(lockPath, "utf-8").catch(() => null)) === token) {
      await fs.rm(lockPath, { force: true });
    }
  }
}

// Write beside the target and rename, so a crash can never leave half a file.
async function writeMetadataFile(filePath: string, metadata: MetadataFile) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(metadata, null, 2)}\n`, "utf-8");
    await fs.rename(temporary, filePath);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

/**
 * Runs `edit` on a fresh read of the file and saves the result when it returns
 * true. Resolves to whether it saved. Holds the in-process queue and the lock
 * file from the read to the rename.
 *
 * `edit` is synchronous on purpose: do slow work (S3 calls, probing images)
 * before the call, so the read it edits is still fresh when it is saved. Set
 * fields or merge into entries, never replace an existing entry whole, so
 * fields another tool owns (alt, altSource, altReviewed) survive.
 */
export async function editMetadataFile(
  filePath: string,
  edit: (metadata: MetadataFile) => boolean,
): Promise<boolean> {
  return serialize(() =>
    withFileLock(filePath, async () => {
      const metadata = await readMetadataFile(filePath);
      if (!edit(metadata)) return false;
      await writeMetadataFile(filePath, metadata);
      return true;
    }),
  );
}

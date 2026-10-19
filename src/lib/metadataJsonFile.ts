/**
 * The one way to write src/content/Notes/_data/metadata.json. Many tools write
 * it, often while another one runs: the upload scripts, syncMetadata,
 * backfillLocalMetadata, syncImageAlt, the asset watcher and /dev/alt-review.
 * Overlapping plain writes once left junk bytes after the closing brace, and
 * whole-entry replacements stripped 598 alt texts.
 *
 * Only node:fs and node:path, so the dev watcher and API routes can import it
 * without loading AWS or CLI dependencies.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

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
 * true. Resolves to whether it saved.
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
  return serialize(async () => {
    const metadata = await readMetadataFile(filePath);
    if (!edit(metadata)) return false;
    await writeMetadataFile(filePath, metadata);
    return true;
  });
}

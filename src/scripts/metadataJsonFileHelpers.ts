import { Presets, SingleBar } from "cli-progress";
import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import pLimit from "p-limit";
import { collectFilesInPath } from "./aws/directoryTraversal";
import { getWidthAndHeightFromFileSystem } from "./aws/getWidthAndHeight";
import { doesFileExistInS3 } from "./aws/helpers";

const __dirname = path.resolve(path.dirname(""));

export const assetsMetadataFilePath = path.join(
  __dirname,
  "src",
  "content",
  "Notes",
  "_data",
  "metadata.json",
);

export interface ImageMetadata {
  key: string;
  width: number;
  height: number;
  aspectRatio: number;
  existsInS3: boolean;
  // Written by syncImageAlt and /dev/alt-review. An update that does not
  // carry them must leave them alone.
  alt?: string;
  altSource?: "manual" | "generated" | "ai";
  altReviewed?: boolean;
}

export type MetadataFile = Record<string, ImageMetadata | undefined>;

/**
 * Reads metadata.json fresh from disk. Other tools (the watchAssets dev
 * watcher, /dev/alt-review, syncImageAlt) write it while scripts run, so a
 * copy loaded at startup goes stale. Throws when the file does not parse, so
 * nobody saves over a file they could not read.
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
 * Every update is a read-modify-write of one big file, so updates in this
 * process run one at a time. Overlapping writes once left junk bytes after
 * the closing brace.
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
 * Merges each update into its existing entry, so fields the update does not
 * carry (alt, altSource, altReviewed) survive. Each call rewrites the whole
 * file, so a run should collect its updates and pass them in one call.
 */
export async function updateMetadataFileBulk(
  filePath: string,
  updates: ImageMetadata[],
): Promise<void> {
  if (updates.length === 0) return;

  await serialize(async () => {
    const metadata = await readMetadataFile(filePath);
    for (const update of updates) {
      metadata[update.key] = { ...metadata[update.key], ...update };
    }
    await writeMetadataFile(filePath, metadata);
  });
}

export async function updateMetadataFile(filePath: string, update: ImageMetadata): Promise<void> {
  await updateMetadataFileBulk(filePath, [update]);
}

const limit = pLimit(1000);

export async function createMetadataFile(dirPath: string, outputPath: string) {
  const existingMetadata = await readMetadataFile(outputPath);

  const imageFiles = await collectFilesInPath(dirPath, {
    filePattern: /\.(jpg|jpeg|png|webp|gif|avif)$/i,
  });
  const progress = new SingleBar(
    {
      format: `Metadata creation | {bar} | {percentage}% | {value}/{total} | {eta}s`,
    },
    Presets.shades_classic,
  );

  progress.start(imageFiles.length, 0);

  const metadataUpdates: ImageMetadata[] = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];

    try {
      const key = path.join("assets", path.relative(dirPath, imagePath));
      const { width, height } = (await getWidthAndHeightFromFileSystem(imagePath)) || {};

      if (!width || !height) return;

      const hasMetadataAlready = existingMetadata[key];

      if (hasMetadataAlready) {
        progress.update(i + 1);
        continue;
      }

      const existsInS3 = await limit(() => doesFileExistInS3(key));
      const newMetadata: ImageMetadata = {
        key: key,
        width: width,
        height: height,
        aspectRatio: width / height,
        existsInS3,
      };

      metadataUpdates.push(newMetadata);
    } catch (error) {
      console.error(`Error processing ${imagePath}:`, error);
    }

    progress.update(i + 1);
  }

  await updateMetadataFileBulk(outputPath, metadataUpdates);

  progress.stop();
}

import "dotenv/config";
import path from "node:path";
import { Presets, SingleBar } from "cli-progress";
import pLimit from "p-limit";
import { getImageMetadataFromS3 } from "../lib/aws";
import {
  assetsMetadataFilePath,
  editMetadataFile,
  type ImageMetadata,
  readMetadataFile,
} from "../lib/metadataJsonFile";
import { getWidthAndHeightFromFileSystem } from "./aws/getWidthAndHeight";
import { listAllObjects } from "./drift/lib/buckets";

const SOURCE_BUCKET = "images.trebeljahr.com";
const LOCAL_ASSETS_ROOT = path.join(process.cwd(), "src", "content", "Notes");

async function main() {
  console.log("Fetching current S3 state...");
  const s3Objects = await listAllObjects(SOURCE_BUCKET);
  const s3Keys = new Set(s3Objects.map((o) => o.Key));

  console.log(`Found ${s3Keys.size} objects in S3.`);

  console.log("Reading existing metadata.json...");
  const metadata = await readMetadataFile(assetsMetadataFilePath);
  const metadataKeys = Object.keys(metadata);

  console.log(`Current metadata has ${metadataKeys.length} entries.`);

  // 1. Stale entries (in metadata but not in S3), removed when saving
  const staleKeys = metadataKeys.filter((key) => !s3Keys.has(key));
  console.log(`Found ${staleKeys.length} stale entries in metadata.`);

  // 2. Add missing entries (in S3 but not in metadata)
  const missingKeys = [...s3Keys].filter((key) => !metadata[key]);
  console.log(`Found ${missingKeys.length} keys in S3 missing from metadata.`);

  const additions: ImageMetadata[] = [];
  if (missingKeys.length > 0) {
    const progress = new SingleBar(
      {
        format: `Fetching missing metadata | {bar} | {percentage}% | {value}/{total} | {eta}s`,
      },
      Presets.shades_classic,
    );
    progress.start(missingKeys.length, 0);

    const limit = pLimit(10); // Throttled S3 requests
    const tasks = missingKeys.map((key) =>
      limit(async () => {
        try {
          // First try to get from S3 metadata
          try {
            const s3Meta = await getImageMetadataFromS3(SOURCE_BUCKET, key);
            additions.push(s3Meta);
          } catch (_e) {
            // If S3 doesn't have dimensions in its custom metadata, try to find local file and probe it
            const localPath = path.join(LOCAL_ASSETS_ROOT, key);
            try {
              const { width, height } = await getWidthAndHeightFromFileSystem(localPath);
              additions.push({
                key,
                width,
                height,
                aspectRatio: width / height,
                existsInS3: true,
              });
            } catch (_localError) {
              // If local file is also not available, we have a problem.
              // We'll skip it for now or mark it as broken.
              // console.error(`\nCould not get dimensions for ${key}`);
            }
          }
        } catch (err) {
          console.error(`\nError processing ${key}: ${err}`);
        } finally {
          progress.increment();
        }
      }),
    );

    await Promise.all(tasks);
    progress.stop();
  }

  console.log("Writing updated metadata.json...");
  // The S3 calls above take minutes and other tools write the file meanwhile,
  // so apply only this run's changes to a fresh read. An entry that appeared in
  // between keeps its alt text: additions merge into it.
  await editMetadataFile(assetsMetadataFilePath, (onDisk) => {
    for (const key of staleKeys) delete onDisk[key];
    for (const entry of additions) onDisk[entry.key] = { ...onDisk[entry.key], ...entry };
    return staleKeys.length + additions.length > 0;
  });
  console.log(`Removed ${staleKeys.length} stale entries, added ${additions.length}.`);
  console.log("Done!");
}

main().catch(console.error);

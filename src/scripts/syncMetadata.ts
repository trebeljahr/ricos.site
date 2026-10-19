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
import { applyS3Sync, findDeletedKeys, findNotUploadedKeys } from "./syncMetadataRules";

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

  // 1. Entries deleted from S3, removed when saving. Entries never uploaded stay.
  const deletedKeys = findDeletedKeys(metadata, s3Keys);
  console.log(`Found ${deletedKeys.length} entries deleted from S3.`);

  const notUploadedKeys = findNotUploadedKeys(metadata, s3Keys);
  if (notUploadedKeys.length > 0) {
    console.log(
      `Keeping ${notUploadedKeys.length} entries never uploaded to S3 (existsInS3: false):`,
    );
    for (const key of notUploadedKeys.slice(0, 20)) console.log(`  ${key}`);
    if (notUploadedKeys.length > 20) console.log(`  …and ${notUploadedKeys.length - 20} more`);
  }

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
  let result = { removed: 0, added: 0, marked: 0 };
  await editMetadataFile(assetsMetadataFilePath, (onDisk) => {
    result = applyS3Sync(onDisk, { s3Keys, deletedKeys, additions });
    return result.removed + result.added + result.marked > 0;
  });
  console.log(
    `Removed ${result.removed} entries, added ${result.added}, marked ${result.marked} as uploaded.`,
  );
  console.log("Done!");
}

main().catch(console.error);

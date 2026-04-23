import "dotenv/config";
import { promises as fs } from "fs";
import path from "path";
import pLimit from "p-limit";
import { Presets, SingleBar } from "cli-progress";
import { listAllObjects } from "./drift/lib/buckets";
import { createS3Client, getImageMetadataFromS3 } from "../lib/aws";
import { assetsMetadataFilePath, ImageMetadata } from "./metadataJsonFileHelpers";
import { getWidthAndHeightFromFileSystem } from "./aws/getWidthAndHeight";

const SOURCE_BUCKET = "images.trebeljahr.com";
const LOCAL_ASSETS_ROOT = path.join(process.cwd(), "src", "content", "Notes");

async function main() {
  console.log("Fetching current S3 state...");
  const s3Objects = await listAllObjects(SOURCE_BUCKET);
  const s3Keys = new Set(s3Objects.map(o => o.Key));
  
  console.log(`Found ${s3Keys.size} objects in S3.`);

  console.log("Reading existing metadata.json...");
  const metadataContent = await fs.readFile(assetsMetadataFilePath, "utf-8");
  const metadata: Record<string, ImageMetadata> = JSON.parse(metadataContent);
  const metadataKeys = Object.keys(metadata);

  console.log(`Current metadata has ${metadataKeys.length} entries.`);

  // 1. Remove stale entries (in metadata but not in S3)
  let removedCount = 0;
  for (const key of metadataKeys) {
    if (!s3Keys.has(key)) {
      delete metadata[key];
      removedCount++;
    }
  }
  console.log(`Removed ${removedCount} stale entries from metadata.`);

  // 2. Add missing entries (in S3 but not in metadata)
  const missingKeys = [...s3Keys].filter(key => !metadata[key]);
  console.log(`Found ${missingKeys.size || missingKeys.length} keys in S3 missing from metadata.`);

  if (missingKeys.length > 0) {
    const progress = new SingleBar(
      {
        format: `Fetching missing metadata | {bar} | {percentage}% | {value}/{total} | {eta}s`,
      },
      Presets.shades_classic
    );
    progress.start(missingKeys.length, 0);

    const limit = pLimit(10); // Throttled S3 requests
    const tasks = missingKeys.map(key => limit(async () => {
      try {
        // First try to get from S3 metadata
        try {
          const s3Meta = await getImageMetadataFromS3(SOURCE_BUCKET, key);
          metadata[key] = s3Meta;
        } catch (e) {
          // If S3 doesn't have dimensions in its custom metadata, try to find local file and probe it
          const localPath = path.join(LOCAL_ASSETS_ROOT, key);
          try {
            const { width, height } = await getWidthAndHeightFromFileSystem(localPath);
            metadata[key] = {
              key,
              width,
              height,
              aspectRatio: width / height,
              existsInS3: true
            };
          } catch (localError) {
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
    }));

    await Promise.all(tasks);
    progress.stop();
  }

  console.log("Writing updated metadata.json...");
  await fs.writeFile(assetsMetadataFilePath, JSON.stringify(metadata, null, 2), "utf-8");
  console.log("Done!");
}

main().catch(console.error);

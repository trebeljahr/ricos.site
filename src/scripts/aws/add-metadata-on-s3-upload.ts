import { Presets, SingleBar } from "cli-progress";
import { readdir } from "fs/promises";
import path from "path";
import { Pool, Worker, spawn } from "threads";
import { uploadSingleFileToS3 } from "./s3-scripts";

export async function parseMetadataForAllImagesInFolder(dir: string) {
  const imageFiles = await findFiles(dir, /\.(jpg|jpeg|png)$/i);
  const pool = Pool(() => spawn(new Worker("./exif-worker.ts")));

  const allResults: { width: number; height: number; imagePath: string }[] = [];
  for (const imagePath of imageFiles) {
    pool.queue(async (exifworker) => {
      const result = await exifworker(imagePath);
      allResults.push(result);
    });
  }

  await pool.completed();
  await pool.terminate();

  return allResults;
}

export async function uploadAllImagesFromDirectoryToS3(dir: string) {
  const imageFiles = await findFiles(dir, /\.(webp)$/i);
  const progress = new SingleBar({}, Presets.shades_classic);

  const pool = Pool(() => spawn(new Worker("./upload-worker.ts")));

  let counter = 0;
  progress.start(imageFiles.length, counter);

  for (const imagePath of imageFiles) {
    pool.queue(async (uploadWorker: typeof uploadSingleFileToS3) => {
      const tripName = imagePath.split("/").at(-2);
      if (!tripName) throw Error("No trip name found in path");
      await uploadWorker(imagePath, tripName);
      progress.update(counter++);
    });
  }

  await pool.completed();
  await pool.terminate();

  progress.stop();
}

async function main() {
  if (process.argv.length !== 3) {
    console.error("Usage: tsx add-metadata-on-s3-upload.ts <dir>");
    process.exit(1);
  }

  const dir = process.argv[2];
  await uploadAllImagesFromDirectoryToS3(dir);
}

main();

export async function findFiles(dir: string, pattern: RegExp) {
  const files = await readdir(dir, { withFileTypes: true });
  let results: string[] = [];
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(await findFiles(filePath, pattern));
    } else if (pattern.test(filePath)) {
      results.push(filePath);
    }
  }
  return results;
}

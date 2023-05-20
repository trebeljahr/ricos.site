import { readdir } from "fs/promises";
import { Pool, Worker, spawn } from "threads";
import { getExifData } from "./getExifData";
import { createKey, uploadWithMetadata } from "./s3-scripts";
import path from "path";

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

  console.log(allResults);
}

async function main() {
  if (process.argv.length !== 3) {
    console.error("Usage: tsx add-metadata-on-s3-upload.js <dir>");
    process.exit(1);
  }

  const filepath = process.argv[2];
  const exifData = await getExifData(filepath);
  console.log(exifData);

  const key = createKey("photography/test", filepath);

  await uploadWithMetadata(filepath, key, {
    width: String(exifData.width),
    height: String(exifData.height),
  });

  console.log(`Done uploading test file!`);
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

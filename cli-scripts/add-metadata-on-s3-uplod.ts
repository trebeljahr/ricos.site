import { exiftool } from "exiftool-vendored";
import { readdir } from "fs/promises";
import path from "path";
import { spawn, Pool, Worker } from "threads";

async function main() {
  // Check if the correct number of arguments are provided
  if (process.argv.length !== 3) {
    console.log("Usage: tsx rename-images.ts <directory-you-want-to-rename>");

    process.exit(1);
  }

  const dir = process.argv[2];

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
  console.log(`Done!`);
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

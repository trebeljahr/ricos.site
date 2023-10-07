import "dotenv/config";
import { Presets, SingleBar } from "cli-progress";
import { lstatSync } from "fs";
import { readdir } from "fs/promises";
import inquirer from "inquirer";
import path from "path";
import { Pool, Worker, spawn } from "threads";
import { uploadSingleFileToS3 } from "./s3-scripts";

async function main() {
  const { dirPath } = await inquirer.prompt<{
    dirPath: string;
  }>([
    {
      type: "input",
      message: "Please provide a path to directory for upload:",
      name: "dirPath",
    },
  ]);

  if (!lstatSync(dirPath).isDirectory()) {
    throw new Error("Please input a valid directory path");
  }

  const folders = await listDirectories(dirPath);

  for (const folder of folders) {
    await uploadAllImagesFromDirectoryToS3(path.join(dirPath, folder));
  }
}

main();

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

export async function uploadAllImagesFromDirectoryToS3(dirPath: string) {
  const imageFiles = await findFiles(dirPath, /\.(webp)$/i);
  const folderName = dirPath.split("/").at(-1);
  const directoryName = dirPath.split("/").at(-2);

  const pool = Pool(() => spawn(new Worker("./upload-worker.ts")));

  let counter = 1;
  const progress = new SingleBar(
    {
      format: `${folderName} | {bar} | {percentage}% | {value}/{total} | {eta}s`,
    },
    Presets.shades_classic
  );
  progress.start(imageFiles.length, counter);

  for (const imagePath of imageFiles) {
    const imageFileName = imagePath.split("/").at(-1);

    if (!folderName || !imageFileName || !directoryName)
      throw Error("Didn't find a valid image to upload...");
    const awsKey = path.join(directoryName, folderName, imageFileName);

    pool.queue(async (uploadWorker: typeof uploadSingleFileToS3) => {
      await uploadWorker(imagePath, awsKey);
      progress.update(counter++);
    });
  }

  await pool.completed();
  await pool.terminate();

  progress.stop();
}

async function listDirectories(dirPath: string) {
  const directories = (await readdir(dirPath, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dir) => dir.name);
  return directories;
}

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

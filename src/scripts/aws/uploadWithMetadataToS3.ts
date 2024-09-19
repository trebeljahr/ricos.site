import { Presets, SingleBar } from "cli-progress";
import "dotenv/config";
import { promises as fs, lstatSync } from "fs";
import { readdir } from "fs/promises";
import inquirer from "inquirer";
import path from "path";
import { Pool, Worker, spawn } from "threads";
import { getWidthAndHeight } from "./getWidthAndHeight";
import {
  doesFileExistInS3,
  uploadSingleFileToS3,
  uploadWithMetadata,
} from "./s3-scripts";

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

  // if (folders.length === 0) {
  await uploadDir(dirPath);
  // } else {
  //   for (const folder of folders) {
  //     await uploadAllImagesFromDirectoryToS3(path.join(dirPath, folder));
  //   }
  // }
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

async function uploadDir(directoryPath: string) {
  async function getFiles(dir: string): Promise<string | string[]> {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      // ignore . files
      dirents
        .filter(
          (dirent) =>
            dirent.name.startsWith(".") === false &&
            dirent.name !== "node_modules"
        )
        .map((dirent) => {
          const res = path.resolve(dir, dirent.name);
          return dirent.isDirectory() ? getFiles(res) : res;
        })
    );
    return Array.prototype.concat(...files);
  }

  const files = (await getFiles(directoryPath)) as string[];

  let counter = 1;

  const dirName = path.basename(directoryPath);
  const format = `${dirName} | {bar} | {percentage}% | {value}/{total} | {eta}s`;
  const progress = new SingleBar({ format }, Presets.shades_classic);

  const filesToUploadPromises = await Promise.all(
    files.map(async (filePath) => {
      const key = path.relative(
        directoryPath.split("/").slice(0, -1).join("/"),
        filePath
      );

      const exists = await doesFileExistInS3(key);
      // console.log(key);
      // console.log(exists ? "File exists" : "File does not exist");
      // progress.update(counter++);

      const hasRightEnding = /\.(jpg|jpeg|png|webp)$/i.test(filePath);
      // const hasRightEnding = /\.(webp)$/i.test(filePath);

      if (!exists && hasRightEnding) return filePath;
    })
  );

  const filesToUpload = filesToUploadPromises.filter(Boolean) as string[];

  progress.start(filesToUpload.length, counter);

  const uploadsPromises = filesToUpload.map(async (filePath) => {
    const data = await getWidthAndHeight(filePath);
    const key = path.relative(
      directoryPath.split("/").slice(0, -1).join("/"),
      filePath
    );
    await uploadWithMetadata(filePath, key, {
      width: String(data?.width),
      height: String(data?.height),
    });
    progress.update(counter++);
  });

  await Promise.all(uploadsPromises);

  progress.stop();
}

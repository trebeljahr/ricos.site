import { Presets, SingleBar } from "cli-progress";
import "dotenv/config";
import { lstatSync } from "fs";
import inquirer from "inquirer";
import pLimit from "p-limit";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  assetsMetadataFilePath,
  localMetadata,
  updateMetadataFile,
} from "../metadataJsonFileHelpers";
import { collectFilesInPath } from "./directoryTraversal";
import { getWidthAndHeightFromFileSystem } from "./getWidthAndHeight";
import { doesFileExistInS3, uploadWithMetadata } from "./helpers";

const argv = await yargs(hideBin(process.argv))
  .option("dirPath", {
    alias: "d",
    description: "Path to directory for upload",
    type: "string",
  })
  .help()
  .alias("help", "h").argv;

async function main() {
  let dirPath = argv.dirPath;

  if (!dirPath) {
    const response = await inquirer.prompt<{ dirPath: string }>([
      {
        type: "input",
        message: "Please provide a path to directory for upload:",
        name: "dirPath",
      },
    ]);
    dirPath = response.dirPath;
  }

  if (!lstatSync(dirPath).isDirectory()) {
    throw new Error("Please input a valid directory path");
  }

  await uploadDir(dirPath);
}

main();

const limit = pLimit(5);

async function uploadDir(directoryPath: string) {
  const files = await collectFilesInPath(directoryPath);

  let counter = 1;

  const dirName = path.basename(directoryPath);
  const format = `${dirName} | {bar} | {percentage}% | {value}/{total} | {eta}s`;
  const progress = new SingleBar({ format }, Presets.shades_classic);

  console.log("Checking for existing files...");
  progress.start(files.length, counter);

  const filesToUploadPromises = await Promise.all(
    files.map(async (filePath) => {
      const key = path.relative(
        directoryPath.split("/").slice(0, -1).join("/"),
        filePath
      );

      const fileMetadata = localMetadata[key];

      if (fileMetadata?.existsInS3) {
        progress.update(counter++);
        return;
      }

      const fileDoesNotExist = !(await limit(() => doesFileExistInS3(key)));
      const fileHasRightEnding = /\.(jpg|jpeg|png|webp)$/i.test(filePath);

      progress.update(counter++);

      if (fileDoesNotExist && fileHasRightEnding) {
        return filePath;
      }

      const { width, height } = await getWidthAndHeightFromFileSystem(filePath);

      await updateMetadataFile(assetsMetadataFilePath, {
        key,
        width,
        height,
        aspectRatio: width / height,
        existsInS3: true,
      });
    })
  );

  const filesToUpload = filesToUploadPromises.filter(Boolean) as string[];
  progress.stop();
  counter = 1;

  console.log("Uploading Files...");
  progress.start(filesToUpload.length, counter);

  const uploadsPromises = filesToUpload.map(async (filePath) => {
    const data = await getWidthAndHeightFromFileSystem(filePath);
    const key = path.relative(
      directoryPath.split("/").slice(0, -1).join("/"),
      filePath
    );
    await limit(() =>
      uploadWithMetadata(filePath, key, {
        width: String(data?.width),
        height: String(data?.height),
      })
    );
    progress.update(counter++);
  });

  await Promise.all(uploadsPromises);

  progress.stop();
}

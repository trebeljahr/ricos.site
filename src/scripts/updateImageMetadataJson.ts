import { Presets, SingleBar } from "cli-progress";
import "dotenv/config";
import { promises as fs, lstatSync } from "fs";
import { readdir } from "fs/promises";
import inquirer from "inquirer";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getWidthAndHeight } from "./aws/getWidthAndHeight";

export async function updateLocalMetadataFile(
  filePath: string,
  newMetadata: ImageMetadata
): Promise<void> {
  try {
    let existingMetadata: ImageMetadata[] = [];

    try {
      const fileContent = await fs.readFile(filePath, "utf-8");
      existingMetadata = JSON.parse(fileContent);
    } catch (readError: any) {
      if (readError.code !== "ENOENT") {
        console.error("Error reading metadata file:", readError);
        throw readError;
      }
    }

    existingMetadata.push(newMetadata);

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const jsonString = JSON.stringify(existingMetadata, null, 2);
    await fs.writeFile(filePath, jsonString, "utf-8");

    console.log(`Metadata updated in local file: ${filePath}`);
  } catch (error) {
    console.error("Error updating local metadata file:", error);
    throw error;
  }
}

interface ImageMetadata {
  imageKey: string;
  bucket: string;
  width: number;
  height: number;
  aspectRatio: number;
}

const argv = await yargs(hideBin(process.argv))
  .option("dirPath", {
    alias: "d",
    description: "Path to directory for metadata creation",
    type: "string",
  })
  .option("bucket", {
    alias: "b",
    description: "Bucket name",
    type: "string",
  })
  .option("output", {
    alias: "o",
    description: "Output path for the metadata file",
    type: "string",
    default: "metadata.json",
  })
  .help()
  .alias("help", "h").argv;

async function main() {
  let dirPath = argv.dirPath;
  let bucket = argv.bucket;
  const outputPath = argv.output;

  if (!dirPath) {
    const response = await inquirer.prompt<{ dirPath: string }>([
      {
        type: "input",
        message: "Please provide a path to directory:",
        name: "dirPath",
      },
    ]);
    dirPath = response.dirPath;
  }

  if (!bucket) {
    const response = await inquirer.prompt<{ bucket: string }>([
      {
        type: "input",
        message: "Please provide a bucket name:",
        name: "bucket",
      },
    ]);
    bucket = response.bucket;
  }

  if (!lstatSync(dirPath).isDirectory()) {
    throw new Error("Please input a valid directory path");
  }

  await createMetadataFile(dirPath, bucket, outputPath);
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

async function createMetadataFile(
  dirPath: string,
  bucket: string,
  outputPath: string
) {
  const imageFiles = await findFiles(dirPath, /\.(jpg|jpeg|png|webp)$/i);
  const progress = new SingleBar(
    {
      format: `Metadata creation | {bar} | {percentage}% | {value}/{total} | {eta}s`,
    },
    Presets.shades_classic
  );

  progress.start(imageFiles.length, 0);

  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    try {
      const { width, height } = (await getWidthAndHeight(imagePath)) || {};

      if (!width || !height) return;

      const key = path.relative(dirPath, imagePath);
      const metadata: ImageMetadata = {
        imageKey: key,
        bucket,
        width: width,
        height: height,
        aspectRatio: width / height,
      };
      await updateLocalMetadataFile(outputPath, metadata);
    } catch (error) {
      console.error(`Error processing ${imagePath}:`, error);
    }
    progress.update(i + 1);
  }

  progress.stop();
  console.log("Metadata file created successfully.");
}

import { Presets, SingleBar } from "cli-progress";
import "dotenv/config";
import { promises as fs } from "fs";
import pLimit from "p-limit";
import path from "path";
import { collectFilesInPath } from "./aws/directoryTraversal";
import { getWidthAndHeightFromFileSystem } from "./aws/getWidthAndHeight";
import { doesFileExistInS3 } from "./aws/helpers";
import { readFile } from "fs/promises";

const __dirname = path.resolve(path.dirname(""));

export const assetsMetadataFilePath = path.join(
  __dirname,
  "src",
  "data",
  "metadata.json"
);

export const localMetadata: Record<string, ImageMetadata | undefined> =
  JSON.parse(await readFile(assetsMetadataFilePath, "utf-8"));

export async function getMetadataFromJsonFile(key: string) {
  try {
    const imageMetadata = localMetadata[key];
    if (!imageMetadata) {
      return null;
    }

    return imageMetadata;
  } catch (error) {
    console.error(`Error getting metadata: ${error}`);
    throw error;
  }
}

export async function updateMetadataFile(
  filePath: string,
  newMetadata: ImageMetadata
): Promise<void> {
  try {
    localMetadata[newMetadata.key] = newMetadata;

    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const jsonString = JSON.stringify(localMetadata, null, 2);
    await fs.writeFile(filePath, jsonString, "utf-8");
  } catch (error) {
    console.error("Error updating local metadata file:", error);
    throw error;
  }
}

export interface ImageMetadata {
  key: string;
  width: number;
  height: number;
  aspectRatio: number;
  existsInS3: boolean;
}

const limit = pLimit(5);

export async function createMetadataFile(dirPath: string, outputPath: string) {
  const fileContent = await fs.readFile(outputPath, "utf-8");
  const existingMetadata = JSON.parse(fileContent);

  const imageFiles = await collectFilesInPath(dirPath, {
    filePattern: /\.(jpg|jpeg|png|webp)$/i,
  });
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
      const key = path.join("assets", path.relative(dirPath, imagePath));
      const { width, height } =
        (await getWidthAndHeightFromFileSystem(imagePath)) || {};

      if (!width || !height) return;

      const hasMetadataAlready = existingMetadata[key];

      if (hasMetadataAlready) {
        progress.update(i + 1);
        continue;
      }

      const existsInS3 = await limit(() => doesFileExistInS3(key));
      const metadata: ImageMetadata = {
        key: key,
        width: width,
        height: height,
        aspectRatio: width / height,
        existsInS3,
      };
      await updateMetadataFile(outputPath, metadata);
    } catch (error) {
      console.error(`Error processing ${imagePath}:`, error);
    }
    progress.update(i + 1);
  }

  progress.stop();
}

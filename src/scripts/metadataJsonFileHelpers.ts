import { Presets, SingleBar } from "cli-progress";
import "dotenv/config";
import path from "node:path";
import pLimit from "p-limit";
import { editMetadataFile, type ImageMetadata, readMetadataFile } from "../lib/metadataJsonFile";
import { collectFilesInPath } from "./aws/directoryTraversal";
import { getWidthAndHeightFromFileSystem } from "./aws/getWidthAndHeight";
import { doesFileExistInS3 } from "./aws/helpers";

export {
  assetsMetadataFilePath,
  type ImageMetadata,
  type MetadataFile,
  readMetadataFile,
} from "../lib/metadataJsonFile";

/**
 * Merges each update into its existing entry, so fields the update does not
 * carry (alt, altSource, altReviewed) survive. Each call rewrites the whole
 * file, so a run should collect its updates and pass them in one call.
 */
export async function updateMetadataFileBulk(
  filePath: string,
  updates: ImageMetadata[],
): Promise<void> {
  if (updates.length === 0) return;

  await editMetadataFile(filePath, (metadata) => {
    for (const update of updates) {
      metadata[update.key] = { ...metadata[update.key], ...update };
    }
    return true;
  });
}

export async function updateMetadataFile(filePath: string, update: ImageMetadata): Promise<void> {
  await updateMetadataFileBulk(filePath, [update]);
}

const limit = pLimit(1000);

export async function createMetadataFile(dirPath: string, outputPath: string) {
  const existingMetadata = await readMetadataFile(outputPath);

  const imageFiles = await collectFilesInPath(dirPath, {
    filePattern: /\.(jpg|jpeg|png|webp|gif|avif)$/i,
  });
  const progress = new SingleBar(
    {
      format: `Metadata creation | {bar} | {percentage}% | {value}/{total} | {eta}s`,
    },
    Presets.shades_classic,
  );

  progress.start(imageFiles.length, 0);

  const metadataUpdates: ImageMetadata[] = [];
  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];

    try {
      const key = path.join("assets", path.relative(dirPath, imagePath));
      const { width, height } = (await getWidthAndHeightFromFileSystem(imagePath)) || {};

      if (!width || !height) return;

      const hasMetadataAlready = existingMetadata[key];

      if (hasMetadataAlready) {
        progress.update(i + 1);
        continue;
      }

      const existsInS3 = await limit(() => doesFileExistInS3(key));
      const newMetadata: ImageMetadata = {
        key: key,
        width: width,
        height: height,
        aspectRatio: width / height,
        existsInS3,
      };

      metadataUpdates.push(newMetadata);
    } catch (error) {
      console.error(`Error processing ${imagePath}:`, error);
    }

    progress.update(i + 1);
  }

  await updateMetadataFileBulk(outputPath, metadataUpdates);

  progress.stop();
}

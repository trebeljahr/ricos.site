import { promises as fs } from "fs";
import path from "path";

interface ImageMetadata {
  imageKey: string;
  bucket: string;
  width: number;
  height: number;
  aspectRatio: number;
  [key: string]: any;
}

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

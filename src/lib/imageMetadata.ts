import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface ImageMetadata {
  key: string;
  width: number;
  height: number;
  aspectRatio: number;
  existsInS3: boolean;
}

let _localMetadata: Record<string, ImageMetadata | undefined> | null = null;

export function getLocalMetadata(): Record<string, ImageMetadata | undefined> {
  if (_localMetadata) return _localMetadata;
  const filePath = resolve(process.cwd(), "src", "content", "Notes", "_data", "metadata.json");
  _localMetadata = JSON.parse(readFileSync(filePath, "utf-8"));
  return _localMetadata!;
}

export const photographyFolder = "assets/photography/";

export async function getMetadataFromJsonFile(key: string) {
  try {
    const imageMetadata = getLocalMetadata()[key];
    if (!imageMetadata) return null;
    return imageMetadata;
  } catch (error) {
    console.error(`Error getting metadata: ${error}`);
    throw error;
  }
}

/** Get image data from local metadata.json. Zero network calls. */
export function getDataFromMetadata(prefix: string) {
  const imagePattern = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
  return Object.entries(getLocalMetadata())
    .filter(([key, meta]) => key.startsWith(prefix) && meta !== undefined)
    .filter(([key]) => imagePattern.test(key))
    .map(([key, meta]) => ({
      name: key.replace(prefix, ""),
      src: key,
      width: meta!.width,
      height: meta!.height,
    }));
}

/** Get first image from local metadata.json for a given prefix. */
export function getFirstImageFromMetadata(prefix: string) {
  const imagePattern = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
  const entry = Object.entries(getLocalMetadata()).find(
    ([key, meta]) => key.startsWith(prefix) && meta !== undefined && imagePattern.test(key),
  );
  if (!entry) throw new Error(`No images found for prefix: ${prefix}`);
  const [key, meta] = entry;
  return {
    name: key.replace(prefix, ""),
    src: key,
    width: meta!.width,
    height: meta!.height,
  };
}

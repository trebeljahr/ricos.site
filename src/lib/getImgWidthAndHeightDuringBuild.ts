import { localMetadata } from "src/scripts/metadataJsonFileHelpers";

export function getImgWidthAndHeightDuringBuild(imageUrl: string): {
  width: number;
  height: number;
} {
  try {
    const { width, height } = localMetadata[imageUrl] || {};
    if (!width || !height) throw new Error("Failed to get image dimensions");
    return { width, height };
  } catch (error) {
    console.error(`Error getting image dimensions: ${error}`);
    throw error;
  }
}

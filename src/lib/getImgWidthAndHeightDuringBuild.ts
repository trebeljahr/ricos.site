import { localMetadata } from "src/scripts/metadataJsonFileHelpers";

export async function getImgWidthAndHeightDuringBuild(
  imageKey: string
): Promise<{
  width: number;
  height: number;
}> {
  try {
    // strip leading slash if present
    let key = imageKey.startsWith("/assets") ? imageKey.substring(1) : imageKey;

    let { width, height } = localMetadata[key] || {};
    if (!width || !height) throw new Error("Failed to get image dimensions");

    return { width, height };
  } catch (error) {
    console.error(`Error getting image dimensions for ${imageKey}: ${error}`);
    throw error;
  }
}

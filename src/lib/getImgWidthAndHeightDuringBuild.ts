import { altFromFilename } from "src/lib/imageAlt";
import { getLocalMetadata } from "src/lib/imageMetadata";

function normalizeKey(imageKey: string): string {
  return imageKey.startsWith("/assets") ? imageKey.substring(1) : imageKey;
}

export async function getImgWidthAndHeightDuringBuild(
  imageKey: string,
): Promise<{ width: number; height: number }> {
  try {
    const key = normalizeKey(imageKey);
    const { width, height } = getLocalMetadata()[key] || {};
    if (!width || !height) throw new Error("Failed to get image dimensions");
    return { width, height };
  } catch (error) {
    console.error(`Error getting image dimensions for ${imageKey}: ${error}`);
    throw error;
  }
}

/**
 * Build-time image metadata lookup: width, height, AND alt. Used by velite
 * to bake alt text directly into MDX nodes so no client runtime lookup is
 * needed.
 */
export async function getImgMetaDuringBuild(
  imageKey: string,
): Promise<{ width: number; height: number; alt: string }> {
  const key = normalizeKey(imageKey);
  const entry = getLocalMetadata()[key];
  if (!entry?.width || !entry?.height) {
    throw new Error(`No dimensions for ${imageKey}`);
  }
  const alt = (entry as { alt?: string }).alt?.trim() || altFromFilename(key);
  return { width: entry.width, height: entry.height, alt };
}

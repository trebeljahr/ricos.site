import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import hidden from "src/content/photography-hidden.json";
import { gallerySlugOf } from "src/lib/utils/gallerySlug";

export interface ImageMetadata {
  key: string;
  width: number;
  height: number;
  aspectRatio: number;
  existsInS3: boolean;
  alt?: string;
}

let _localMetadata: Record<string, ImageMetadata | undefined> | null = null;

export function getLocalMetadata(): Record<string, ImageMetadata | undefined> {
  if (_localMetadata) return _localMetadata;
  const filePath = resolve(process.cwd(), "src", "content", "Notes", "_data", "metadata.json");
  _localMetadata = JSON.parse(readFileSync(filePath, "utf-8"));
  return _localMetadata!;
}

export const photographyFolder = "assets/photography/";

/**
 * Photos taken off every photography page: the galleries, the spectrum and the
 * random-photo egg. Their files stay in S3 and the metadata, so a post or travel
 * story that embeds one keeps working. Keys as in metadata.json.
 */
const hiddenPhotos = new Set<string>(hidden);
export const isHiddenPhoto = (key: string) => hiddenPhotos.has(key.replace(/^\//, ""));

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
      // Without this the gallery falls back to the filename as alt text.
      ...(meta!.alt ? { alt: meta!.alt } : {}),
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
    ...(meta!.alt ? { alt: meta!.alt } : {}),
  };
}

/** Every photography folder that has images in the metadata, grouped by gallery. */
function getPhotographyFoldersBySlug(): Map<string, string[]> {
  const folders = new Set(
    Object.keys(getLocalMetadata())
      .filter((key) => key.startsWith(photographyFolder))
      .map((key) => key.replace(photographyFolder, "").split("/")[0])
      .filter(Boolean),
  );
  const bySlug = new Map<string, string[]>();
  for (const folder of folders) {
    const slug = gallerySlugOf(folder);
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), folder]);
  }
  // Newest trip first: "vietnam-2026" sorts after "vietnam", so reverse.
  for (const list of bySlug.values()) list.sort().reverse();
  return bySlug;
}

/**
 * Every photography gallery that has images in the metadata. This is the
 * single source of truth for which `/photography/[tripName]` routes exist, so
 * both the gallery index and `getStaticPaths` read from it and can't drift apart.
 */
export function getPhotographyTripNames(): string[] {
  return [...getPhotographyFoldersBySlug().keys()].sort();
}

/** The photography folders behind one gallery, newest trip first. */
export function getPhotographyFolders(slug: string): string[] {
  return getPhotographyFoldersBySlug().get(slug) ?? [];
}

/** Every shown image of one gallery, across all its folders. */
export function getPhotographyGalleryImages(slug: string) {
  return getPhotographyFolders(slug)
    .flatMap((folder) => getDataFromMetadata(`${photographyFolder}${folder}/`))
    .filter(({ src }) => !isHiddenPhoto(src));
}

/** First shown image of one gallery, for galleries without a curated cover. */
export function getFirstPhotographyImage(slug: string) {
  const [first] = getPhotographyGalleryImages(slug);
  if (!first) throw new Error(`No images found for gallery: ${slug}`);
  return first;
}

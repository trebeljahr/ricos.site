/**
 * The gallery a photography folder belongs to: the folder name without a
 * trailing year. "bolivia-2025" is served as /photography/bolivia, and
 * "vietnam" and "vietnam-2026" are two trips in one Vietnam gallery.
 */
export function gallerySlugOf(folder: string): string {
  return folder.replace(/-(?:19|20)\d{2}$/, "");
}

/** Gallery slug out of an image key, "[/]assets/photography/<folder>/<file>". */
export function gallerySlugOfKey(key: string): string {
  return gallerySlugOf(key.replace(/^\/?assets\/photography\//, "").split("/")[0] ?? "");
}

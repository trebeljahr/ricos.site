/**
 * Image alt-text helpers — client-safe.
 *
 * There is NO client runtime lookup against metadata.json — that file is
 * ~2.8 MB and shouldn't ship to the browser. Alt text is baked into each
 * image node during velite processing (see getImgMetaDuringBuild +
 * remarkGroupImages in velite.config.ts), so callers can read `photo.alt`
 * directly. These helpers are the last-resort fallback when no alt is
 * available, and a small server-side lookup used by build scripts.
 */

export function altFromFilename(src: string): string {
  const last = src.split("/").pop() || "";
  const noExt = last.replace(/\.[a-zA-Z0-9]+$/, "");
  const words = noExt.replace(/[-_]+/g, " ").trim();
  if (!words) return "";
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function resolveAlt(src: string, explicitAlt?: string | null): string {
  if (explicitAlt && explicitAlt.trim().length > 0) return explicitAlt;
  return altFromFilename(src);
}

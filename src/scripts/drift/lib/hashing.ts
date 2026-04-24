import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

/**
 * md5 of a local file, hex-encoded. Matches the ETag of a non-multipart S3
 * upload (the source bucket currently uses only single-part uploads so
 * ETags == MD5 hex; verified across the whole bucket).
 */
export async function md5File(path: string): Promise<string> {
  const buf = await readFile(path);
  return createHash("md5").update(buf).digest("hex");
}

export function stripImageExt(key: string): string {
  return key.replace(/\.(jpg|jpeg|png|webp|gif|avif)$/i, "");
}

export function isUglyName(key: string): boolean {
  const base = key.split("/").pop()!.toLowerCase();
  if (/^(pxl_|img[-_]|dsc|wa\d|\d{6,})/.test(base)) return true;
  if (base.includes("~2") || base.includes("long_exposure") || base.includes("cover")) return true;
  return false;
}

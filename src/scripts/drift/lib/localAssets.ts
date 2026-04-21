import { readdir } from "fs/promises";
import { join, extname } from "path";
import { md5File } from "./hashing";

const IMG_EXTS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
]);

export const LOCAL_ASSETS_ROOT =
  "src/content/Notes/assets";

export interface LocalFile {
  /** S3-style key relative to Notes/ (e.g. "assets/blog/foo.jpg"). */
  key: string;
  /** Absolute path on disk. */
  abs: string;
}

async function* walkImages(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walkImages(p);
    else if (IMG_EXTS.has(extname(e.name).toLowerCase())) yield p;
  }
}

/**
 * Enumerate every image under src/content/Notes/assets, returning S3-style
 * keys (prefixed with "assets/") so they compare 1:1 with bucket keys.
 */
export async function listLocalImages(
  repoRoot: string
): Promise<LocalFile[]> {
  const base = join(repoRoot, LOCAL_ASSETS_ROOT);
  const out: LocalFile[] = [];
  for await (const abs of walkImages(base)) {
    const rel = abs.slice(base.length + 1);
    out.push({ key: `assets/${rel}`, abs });
  }
  return out;
}

/**
 * Hash every local image. Serial-by-default (fast enough on SSD and avoids
 * the xargs-md5 interleaving bug that cost us a debugging round).
 */
export async function hashLocalImages(
  files: LocalFile[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < files.length; i++) {
    out.set(files[i].key, await md5File(files[i].abs));
    onProgress?.(i + 1, files.length);
  }
  return out;
}

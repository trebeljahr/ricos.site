import { readdir, readFile, stat } from "fs/promises";
import { join, extname } from "path";
import { stripImageExt } from "./hashing";

const SCAN_EXTS = new Set([
  ".md",
  ".mdx",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".html",
  ".json",
]);

/**
 * Paths that are treated as dynamic (listed at runtime via S3 list, never
 * referenced by filename in MD/MDX/code). These should be excluded from
 * "unreferenced" analyses or they'll all look dead.
 */
export const DYNAMIC_PREFIXES = [
  "assets/photography/",
  "assets/midjourney-gallery/",
  "favicon/",
];

/**
 * Matches `assets/...ext` and `/assets/...ext` as well as the extensionless
 * CloudFront form `/assets/.../<width>.webp`.
 */
const REF_RE =
  /(\/?)(assets\/[^)"'<>\s]+?)(\/\d+\.webp|\.(?:jpg|jpeg|png|webp|gif|avif))/gi;

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(p);
    } else if (SCAN_EXTS.has(extname(e.name))) {
      yield p;
    }
  }
}

/**
 * Scan the repo for every `assets/...` reference. Returns two sets:
 *  - fullRefs:    full extension paths (e.g. assets/blog/foo.jpg)
 *  - logicalRefs: extension-stripped paths (matches CloudFront /width.webp form)
 *
 * The metadata.json cache is deliberately excluded — it's a mirror of the
 * bucket, not a reference.
 */
export async function scanReferences(roots: string[]): Promise<{
  fullRefs: Set<string>;
  logicalRefs: Set<string>;
}> {
  const fullRefs = new Set<string>();
  const logicalRefs = new Set<string>();
  for (const root of roots) {
    const st = await stat(root).catch(() => null);
    if (!st) continue;
    const files: string[] = st.isFile() ? [root] : [];
    if (!st.isFile()) {
      for await (const f of walk(root)) files.push(f);
    }
    for (const f of files) {
      if (f.endsWith("_data/metadata.json")) continue;
      const txt = await readFile(f, "utf8").catch(() => "");
      if (!txt) continue;
      for (const m of txt.matchAll(REF_RE)) {
        const full = (m[2] + m[3]).replace(/^\//, "");
        if (m[3].startsWith("/") && m[3].endsWith(".webp")) {
          // /width.webp form → logical (extensionless)
          logicalRefs.add(m[2].replace(/^\//, ""));
        } else {
          fullRefs.add(full);
          logicalRefs.add(stripImageExt(full));
        }
      }
    }
  }
  return { fullRefs, logicalRefs };
}

/**
 * True if the key (with extension) is referenced somewhere in the repo,
 * either literally or via the extensionless /width.webp form.
 */
export function isReferenced(
  key: string,
  refs: { fullRefs: Set<string>; logicalRefs: Set<string> }
): boolean {
  if (refs.fullRefs.has(key)) return true;
  return refs.logicalRefs.has(stripImageExt(key));
}

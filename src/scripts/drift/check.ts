/**
 * Drift report across the three stores:
 *   1. Local Obsidian assets (src/content/Notes/assets/**)
 *   2. Source S3 bucket (images.trebeljahr.com)
 *   3. Transformed S3 bucket (images.trebeljahr.com.resized)
 *
 * Prints a human-readable summary. Read-only — never mutates anything.
 * For cleanup, use `reconcile.ts`.
 *
 *   npm run drift:check
 */
import "dotenv/config";
import { cwd } from "process";
import { listAllObjects } from "./lib/buckets";
import { stripImageExt } from "./lib/hashing";
import { LOCAL_ASSETS_ROOT, hashLocalImages, listLocalImages } from "./lib/localAssets";
import { DYNAMIC_PREFIXES, scanReferences } from "./lib/references";

const SOURCE_BUCKET = "images.trebeljahr.com";
const RESIZED_BUCKET = "images.trebeljahr.com.resized";

const NOTES_CATEGORIES = [
  "assets/blog/",
  "assets/booknotes/",
  "assets/book-covers/",
  "assets/midjourney/",
  "assets/newsletter/",
  "assets/pages/",
  "assets/project-notes/",
  "assets/Pasted",
];

function isNotesKey(k: string): boolean {
  return NOTES_CATEGORIES.some((p) => k.startsWith(p));
}

function topFolder(k: string): string {
  const parts = k.split("/");
  if (parts.length < 2) return k;
  return `${parts[0]}/${parts[1]}`;
}

function secondLevel(k: string): string {
  const parts = k.split("/");
  if (parts.length >= 3) return `${parts[1]}/${parts[2]}`;
  return parts[1] ?? k;
}

function tally(items: string[], keyFn: (s: string) => string) {
  const m = new Map<string, number>();
  for (const it of items) {
    const k = keyFn(it);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function fmt(n: number): string {
  return n.toLocaleString();
}

async function main() {
  console.log("Scanning…");
  const [source, resized, localFiles] = await Promise.all([
    listAllObjects(SOURCE_BUCKET),
    listAllObjects(RESIZED_BUCKET),
    listLocalImages(cwd()),
  ]);

  const sourceKeys = new Set(source.map((o) => o.Key));
  const sourceByHash = new Map<string, string[]>();
  for (const o of source) {
    const arr = sourceByHash.get(o.ETag) ?? [];
    arr.push(o.Key);
    sourceByHash.set(o.ETag, arr);
  }
  const sourceSize = source.reduce((s, o) => s + o.Size, 0);
  const resizedKeys = new Set(resized.map((o) => o.Key));
  const resizedLogical = new Set([...resizedKeys].map((k) => k.replace(/\/\d+\.webp$/, "")));
  const sourceLogical = new Set([...sourceKeys].map(stripImageExt));
  const localKeys = new Set(localFiles.map((f) => f.key));

  console.log(`  source:   ${fmt(sourceKeys.size)} objects, ${(sourceSize / 1e9).toFixed(2)} GB`);
  console.log(`  resized:  ${fmt(resizedKeys.size)} objects`);
  console.log(`  local:    ${fmt(localKeys.size)} files`);

  // Notes-category drift (bucket ↔ local)
  const srcNotes = [...sourceKeys].filter(isNotesKey);
  const localNotes = [...localKeys].filter(isNotesKey);
  const srcOnly = srcNotes.filter((k) => !localKeys.has(k));
  const localOnly = localNotes.filter((k) => !sourceKeys.has(k));

  console.log("\n=== NOTES-category drift (bucket ↔ local) ===");
  console.log(`  source:        ${fmt(srcNotes.length)}`);
  console.log(`  local:         ${fmt(localNotes.length)}`);
  console.log(`  source ∖ local: ${fmt(srcOnly.length)}`);
  console.log(`  local ∖ source: ${fmt(localOnly.length)}`);
  if (srcOnly.length) {
    console.log("  source-only by subfolder:");
    for (const [k, v] of tally(srcOnly, secondLevel).slice(0, 12))
      console.log(`    ${String(v).padStart(4)}  ${k}`);
  }
  if (localOnly.length) {
    console.log("  local-only (need upload):");
    for (const [k, v] of tally(localOnly, secondLevel).slice(0, 12))
      console.log(`    ${String(v).padStart(4)}  ${k}`);
  }

  // Dynamic folders (photography, midjourney-gallery)
  console.log("\n=== DYNAMIC folders (authoritative = S3 source) ===");
  for (const prefix of ["assets/photography/", "assets/midjourney-gallery/"]) {
    const sCount = [...sourceKeys].filter((k) => k.startsWith(prefix)).length;
    const lCount = [...localKeys].filter((k) => k.startsWith(prefix)).length;
    const sByte = source.filter((o) => o.Key.startsWith(prefix)).reduce((s, o) => s + o.Size, 0);
    console.log(
      `  ${prefix.padEnd(28)} source=${fmt(sCount)}  local=${fmt(
        lCount,
      )}  size=${(sByte / 1e9).toFixed(2)} GB`,
    );
  }

  // Resized-bucket drift
  const resizedOrphans = [...resizedLogical].filter((k) => !sourceLogical.has(k));
  const sourceNoVariants = [...sourceLogical].filter((k) => !resizedLogical.has(k));
  console.log("\n=== RESIZED bucket drift ===");
  console.log(`  resized logical keys:              ${fmt(resizedLogical.size)}`);
  console.log(`  orphaned (no source behind):       ${fmt(resizedOrphans.length)}`);
  console.log(`  source keys with no variants:      ${fmt(sourceNoVariants.length)}`);
  if (resizedOrphans.length) {
    console.log("  orphan breakdown:");
    for (const [k, v] of tally(resizedOrphans, topFolder).slice(0, 10))
      console.log(`    ${String(v).padStart(4)}  ${k}`);
  }

  // Unreferenced source keys (exclude dynamic folders)
  const refs = await scanReferences([
    "src/content/Notes",
    "src/pages",
    "src/components",
    "public/feed.json",
    "public/search-index.json",
  ]);
  const unreferenced = [...sourceKeys].filter((k) => {
    if (DYNAMIC_PREFIXES.some((p) => k.startsWith(p))) return false;
    if (refs.fullRefs.has(k)) return false;
    if (refs.logicalRefs.has(stripImageExt(k))) return false;
    return true;
  });
  const unrefSize = source
    .filter((o) => unreferenced.includes(o.Key))
    .reduce((s, o) => s + o.Size, 0);
  console.log("\n=== UNREFERENCED in source bucket ===");
  console.log(`  total:    ${fmt(unreferenced.length)} files, ${(unrefSize / 1e6).toFixed(1)} MB`);
  if (unreferenced.length) {
    for (const [k, v] of tally(unreferenced, topFolder).slice(0, 10))
      console.log(`    ${String(v).padStart(4)}  ${k}`);
  }

  // Content-duplicate scan: local files whose hash also exists in the source
  // bucket under a photography/ key (the "blog copies of photos" case).
  console.log("\n=== CONTENT DUPES (local ↔ photography) ===");
  process.stdout.write("  hashing local files…");
  const localHashes = await hashLocalImages(localFiles);
  process.stdout.write(" done\n");
  let dupCount = 0;
  let dupSize = 0;
  for (const f of localFiles) {
    const h = localHashes.get(f.key)!;
    const matches = (sourceByHash.get(h) ?? []).filter(
      (k) => k !== f.key && k.startsWith("assets/photography/"),
    );
    if (matches.length && !f.key.startsWith("assets/photography/")) {
      dupCount++;
      const size = source.find((o) => o.Key === f.key)?.Size ?? 0;
      dupSize += size;
    }
  }
  console.log(`  local notes-asset files duplicated in photography/: ${fmt(dupCount)}`);
  console.log(`  redundant size (local + matching source): ~${(dupSize / 1e6).toFixed(1)} MB`);
  if (dupCount > 0) {
    console.log("  → run `npm run drift:fix` to consolidate onto photography/");
  }

  console.log(`\nDone. Local assets scanned under ${LOCAL_ASSETS_ROOT}. No mutations performed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

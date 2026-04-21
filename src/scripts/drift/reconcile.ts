/**
 * Interactive drift reconciliation. Walks through each category of drift
 * detected by `check.ts` and asks before applying any mutation.
 *
 * Categories handled:
 *   1. local ∖ source     → upload (needs AWS credentials)
 *   2. source ∖ local     → download (safe, never touches bucket)
 *   3. content dupes of photography/ → rewrite MDX + delete blog copies
 *   4. resized orphans    → delete stale variants
 *
 * Every mutation is confirmed with a y/n prompt. Pass --yes to auto-confirm.
 *
 *   npm run drift:fix
 *   npm run drift:fix -- --yes
 */
import "dotenv/config";
import inquirer from "inquirer";
import { cwd } from "process";
import { readFile, writeFile } from "fs/promises";
import { join, extname, dirname } from "path";
import { mkdir, rm } from "fs/promises";
import { statSync, readdirSync } from "fs";
import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { createS3Client } from "src/lib/aws";
import {
  deleteObjects,
  listAllObjects,
  renameObject,
} from "./lib/buckets";
import {
  hashLocalImages,
  listLocalImages,
  LOCAL_ASSETS_ROOT,
} from "./lib/localAssets";
import { isUglyName, stripImageExt } from "./lib/hashing";
import { DYNAMIC_PREFIXES, scanReferences } from "./lib/references";

const SOURCE_BUCKET = "images.trebeljahr.com";
const RESIZED_BUCKET = "images.trebeljahr.com.resized";
const NOTES_ROOT = "src/content/Notes";

const argv = process.argv.slice(2);
const AUTO_YES = argv.includes("--yes") || argv.includes("-y");

async function confirm(msg: string, defaultYes = false): Promise<boolean> {
  if (AUTO_YES) return true;
  const r = await inquirer.prompt([
    { type: "confirm", name: "ok", message: msg, default: defaultYes },
  ]);
  return r.ok as boolean;
}

async function loadState() {
  console.log("Scanning…");
  const [source, resized, localFiles] = await Promise.all([
    listAllObjects(SOURCE_BUCKET),
    listAllObjects(RESIZED_BUCKET),
    listLocalImages(cwd()),
  ]);
  return { source, resized, localFiles };
}

async function downloadKey(key: string, absDest: string) {
  const client = createS3Client();
  const r = await client.send(
    new GetObjectCommand({ Bucket: SOURCE_BUCKET, Key: key })
  );
  const buf = Buffer.from(await r.Body!.transformToByteArray());
  await mkdir(dirname(absDest), { recursive: true });
  await writeFile(absDest, buf);
}

async function uploadKey(absSrc: string, key: string) {
  const client = createS3Client();
  // Extract dimensions via sharp if available, otherwise skip metadata
  let metadata: Record<string, string> | undefined;
  try {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(absSrc).metadata();
    if (meta.width && meta.height) {
      metadata = {
        width: String(meta.width),
        height: String(meta.height),
        aspectRatio: String(meta.width / meta.height),
      };
    }
  } catch {
    // sharp missing / unreadable file — upload without metadata
  }
  const Body = await readFile(absSrc);
  const mime = await import("mime");
  await client.send(
    new PutObjectCommand({
      Bucket: SOURCE_BUCKET,
      Key: key,
      Body,
      ContentType: mime.default.getType(absSrc) ?? undefined,
      Metadata: metadata,
    })
  );
}

// ---------- Step 1: local-only → upload ----------
async function handleLocalOnly(
  localFiles: { key: string; abs: string }[],
  sourceKeys: Set<string>
) {
  const localOnly = localFiles.filter((f) => !sourceKeys.has(f.key));
  if (!localOnly.length) {
    console.log("\n[1/4] local-only: none");
    return 0;
  }
  console.log(`\n[1/4] local-only: ${localOnly.length} files need upload`);
  for (const f of localOnly.slice(0, 5)) console.log(`    ${f.key}`);
  if (localOnly.length > 5) console.log(`    … (+${localOnly.length - 5})`);
  if (!(await confirm("Upload them?", true))) return 0;
  let ok = 0;
  for (const f of localOnly) {
    try {
      await uploadKey(f.abs, f.key);
      ok++;
      process.stdout.write(`\r  uploaded ${ok}/${localOnly.length}`);
    } catch (e) {
      console.error(`\n  FAIL ${f.key}:`, e);
    }
  }
  console.log();
  return ok;
}

// ---------- Step 2: source-only → download ----------
async function handleSourceOnly(
  source: { Key: string }[],
  localKeys: Set<string>
) {
  const srcOnly = source
    .map((o) => o.Key)
    .filter(
      (k) =>
        !localKeys.has(k) &&
        !DYNAMIC_PREFIXES.some((p) => k.startsWith(p)) &&
        !k.startsWith("favicon/")
    );
  if (!srcOnly.length) {
    console.log("\n[2/4] source-only: none");
    return 0;
  }
  console.log(`\n[2/4] source-only: ${srcOnly.length} files missing locally`);
  for (const k of srcOnly.slice(0, 5)) console.log(`    ${k}`);
  if (srcOnly.length > 5) console.log(`    … (+${srcOnly.length - 5})`);
  if (!(await confirm("Download them into the Notes repo?", true))) return 0;
  let ok = 0;
  for (const k of srcOnly) {
    try {
      await downloadKey(k, join(cwd(), NOTES_ROOT, k));
      ok++;
      process.stdout.write(`\r  downloaded ${ok}/${srcOnly.length}`);
    } catch (e) {
      console.error(`\n  FAIL ${k}:`, e);
    }
  }
  console.log();
  return ok;
}

// ---------- Step 3: content dupes of photography/ → consolidate ----------
interface DupePlan {
  /** blog-side key to remove from source + local */
  blogKey: string;
  /** canonical photography key (may be a rename target) */
  photoKey: string;
  /** if set, photography file should be renamed FROM this to photoKey */
  renameFrom?: string;
}

function pickCanonical(blogKey: string, photoMatches: string[]): {
  chosen: string;
  rename?: string;
} {
  const topic = blogKey.split("/")[2];
  const base = blogKey.split("/").pop()!;
  const inTopic = photoMatches.filter((p) =>
    p.startsWith(`assets/photography/${topic}/`)
  );
  const pool = inTopic.length ? inTopic : photoMatches;
  const sameBase = pool.find((p) => p.split("/").pop() === base);
  if (sameBase) return { chosen: sameBase };
  const nice = pool.filter((p) => !isUglyName(p));
  if (nice.length)
    return { chosen: nice.sort((a, b) => a.length - b.length)[0] };
  // All matches ugly — rename one to the blog basename
  const ugly = pool.sort((a, b) => a.length - b.length)[0];
  const renameTarget = `assets/photography/${topic}/${base}`;
  return { chosen: renameTarget, rename: ugly };
}

async function handleContentDupes(
  source: { Key: string; ETag: string }[],
  localFiles: { key: string; abs: string }[]
) {
  console.log(`\n[3/4] content-dupe scan (blog ↔ photography)…`);
  const byHash = new Map<string, string[]>();
  for (const o of source) {
    const arr = byHash.get(o.ETag) ?? [];
    arr.push(o.Key);
    byHash.set(o.ETag, arr);
  }
  const localHashes = await hashLocalImages(localFiles);

  const plans: DupePlan[] = [];
  for (const f of localFiles) {
    if (!f.key.startsWith("assets/blog/")) continue;
    const h = localHashes.get(f.key)!;
    const matches = (byHash.get(h) ?? []).filter(
      (k) => k !== f.key && k.startsWith("assets/photography/")
    );
    if (!matches.length) continue;
    const { chosen, rename } = pickCanonical(f.key, matches);
    plans.push({ blogKey: f.key, photoKey: chosen, renameFrom: rename });
  }

  // Also catch source-only dupes (blog keys that exist in source but not local)
  const sourceKeys = new Set(source.map((o) => o.Key));
  const localKeys = new Set(localFiles.map((f) => f.key));
  for (const o of source) {
    if (!o.Key.startsWith("assets/blog/")) continue;
    if (localKeys.has(o.Key)) continue;
    const matches = (byHash.get(o.ETag) ?? []).filter(
      (k) => k !== o.Key && k.startsWith("assets/photography/")
    );
    if (!matches.length) continue;
    const { chosen, rename } = pickCanonical(o.Key, matches);
    plans.push({ blogKey: o.Key, photoKey: chosen, renameFrom: rename });
  }

  if (!plans.length) {
    console.log("  no content dupes found");
    return 0;
  }

  const renames = plans.filter((p) => p.renameFrom).length;
  const collisions = plans
    .filter((p) => p.renameFrom && sourceKeys.has(p.photoKey))
    .map((p) => p.photoKey);
  console.log(`  ${plans.length} dupe pairs to consolidate`);
  console.log(`  ${renames} require a photography rename (ugly → slug)`);
  if (collisions.length)
    console.log(`  ⚠️  ${collisions.length} rename targets already exist — skipping those`);
  console.log(`  MDX references will be rewritten for each.`);
  if (!(await confirm("Apply?", false))) return 0;

  // 3a. Rename photography files server-side + locally
  let renamedOk = 0;
  for (const p of plans) {
    if (!p.renameFrom) continue;
    if (sourceKeys.has(p.photoKey)) continue; // collision: skip
    try {
      await renameObject(SOURCE_BUCKET, p.renameFrom, p.photoKey);
      const localFrom = join(cwd(), NOTES_ROOT, p.renameFrom);
      const localTo = join(cwd(), NOTES_ROOT, p.photoKey);
      try {
        statSync(localFrom);
        await mkdir(dirname(localTo), { recursive: true });
        const { rename: fsRename } = await import("fs/promises");
        await fsRename(localFrom, localTo);
      } catch {
        /* local file may not exist */
      }
      renamedOk++;
    } catch (e) {
      console.error(`  rename FAIL ${p.renameFrom}:`, e);
    }
  }
  if (renames) console.log(`  renamed: ${renamedOk}/${renames}`);

  // 3b. Rewrite MDX references blog/X → photography/X
  const rewriteMap = new Map(plans.map((p) => [p.blogKey, p.photoKey]));
  const logicalMap = new Map<string, string>();
  for (const [b, p] of rewriteMap) {
    logicalMap.set(stripImageExt(b), stripImageExt(p));
  }
  const REWRITE_RE =
    /(\/?)(assets\/blog\/[^)"'<>\s]+?)(\/\d+\.webp|\.(?:jpg|jpeg|png|webp|gif|avif))/gi;
  const roots = [
    join(cwd(), "src/content/Notes"),
    join(cwd(), "src/pages"),
    join(cwd(), "src/components"),
  ];
  let rewrites = 0;
  let filesTouched = 0;
  async function* walk(dir: string): AsyncGenerator<string> {
    const { readdir } = await import("fs/promises");
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) yield* walk(p);
      else if (
        [".md", ".mdx", ".ts", ".tsx", ".js", ".jsx", ".json"].includes(
          extname(e.name)
        )
      )
        yield p;
    }
  }
  for (const root of roots) {
    for await (const f of walk(root)) {
      if (f.endsWith("_data/metadata.json")) continue;
      const txt = await readFile(f, "utf8").catch(() => "");
      if (!txt) continue;
      let changed = false;
      const next = txt.replace(REWRITE_RE, (_m, lead, path, tail) => {
        if (tail.startsWith("/") && tail.endsWith(".webp")) {
          const newLogical = logicalMap.get(path);
          if (newLogical) {
            changed = true;
            rewrites++;
            return `${lead}${newLogical}${tail}`;
          }
        } else {
          const full = path + tail;
          const newFull = rewriteMap.get(full);
          if (newFull) {
            changed = true;
            rewrites++;
            return `${lead}${newFull}`;
          }
        }
        return _m;
      });
      if (changed) {
        await writeFile(f, next);
        filesTouched++;
      }
    }
  }
  console.log(`  MDX rewrites: ${rewrites} across ${filesTouched} files`);

  // 3c. Delete local blog copies
  let localDeleted = 0;
  for (const p of plans) {
    const abs = join(cwd(), NOTES_ROOT, p.blogKey);
    try {
      await rm(abs);
      localDeleted++;
    } catch {
      /* not present locally */
    }
  }
  console.log(`  local blog copies deleted: ${localDeleted}`);

  // 3d. Delete blog keys from source bucket
  const toDeleteSource = plans.map((p) => p.blogKey);
  // Also delete the old photography keys that got renamed
  for (const p of plans) {
    if (p.renameFrom && !sourceKeys.has(p.photoKey)) {
      // already handled by rename (which deletes old)
    }
  }
  const { deleted, errors } = await deleteObjects(
    SOURCE_BUCKET,
    toDeleteSource
  );
  if (errors.length) console.error("  delete errors:", errors.slice(0, 3));
  console.log(`  source bucket blog keys deleted: ${deleted}/${toDeleteSource.length}`);

  return plans.length;
}

// ---------- Step 4: resized-bucket orphan cleanup ----------
async function handleResizedOrphans(
  source: { Key: string }[],
  resized: { Key: string }[]
) {
  const sourceLogical = new Set(source.map((o) => stripImageExt(o.Key)));
  const orphans = resized
    .map((o) => o.Key)
    .filter((k) => !sourceLogical.has(k.replace(/\/\d+\.webp$/, "")));
  if (!orphans.length) {
    console.log("\n[4/4] resized orphans: none");
    return 0;
  }
  console.log(`\n[4/4] resized orphans: ${orphans.length} variants with no source`);
  if (!(await confirm("Delete them from the resized bucket?", true))) return 0;
  const { deleted, errors } = await deleteObjects(RESIZED_BUCKET, orphans);
  if (errors.length) console.error("  delete errors:", errors.slice(0, 3));
  console.log(`  deleted: ${deleted}/${orphans.length}`);
  return deleted;
}

async function main() {
  const { source, resized, localFiles } = await loadState();
  const sourceKeys = new Set(source.map((o) => o.Key));
  const localKeys = new Set(localFiles.map((f) => f.key));

  await handleLocalOnly(localFiles, sourceKeys);
  await handleSourceOnly(source, localKeys);
  // Re-fetch state after step 2 (new files may now be local)
  const localFiles2 = await listLocalImages(cwd());
  const source2 = await listAllObjects(SOURCE_BUCKET);
  await handleContentDupes(source2, localFiles2);
  // Re-fetch again after step 3 (source has fewer keys, resized has orphans)
  const [source3, resized3] = await Promise.all([
    listAllObjects(SOURCE_BUCKET),
    listAllObjects(RESIZED_BUCKET),
  ]);
  await handleResizedOrphans(source3, resized3);

  console.log("\nDone. Run `npm run drift:check` to verify final state.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

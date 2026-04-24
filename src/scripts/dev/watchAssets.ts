/**
 * Asset watcher — keeps metadata.json and (optionally) the S3 source
 * bucket in sync with whatever lands in src/content/Notes/assets/.
 *
 * Meant to run alongside `npm run dev` via `concurrently`. Safe to run
 * standalone too (`npm run watch:assets`). Debounces bursts of writes
 * (Obsidian often writes a file several times during paste/import) and
 * only uploads after the burst settles.
 *
 * Modes:
 *   IMAGE_BACKEND=local  (or unset)  → update metadata.json only.
 *                                      MinIO serves the file directly from
 *                                      disk, no upload step required.
 *   IMAGE_BACKEND=aws                → also upload new/changed files to
 *                                      the real S3 bucket with width/height/
 *                                      aspectRatio metadata.
 *
 * NEVER deletes S3 objects. Deletions go through `npm run drift:fix`.
 */
import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { cwd } from "node:process";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import chokidar from "chokidar";
import mime from "mime";
import sharp from "sharp";
import { createS3Client } from "src/lib/aws";

const ASSETS_ROOT = resolve(cwd(), "src/content/Notes/assets");
const METADATA_PATH = resolve(cwd(), "src/content/Notes/_data/metadata.json");
const BUCKET = "images.trebeljahr.com";
const IMAGE_RE = /\.(jpg|jpeg|png|webp|gif|avif)$/i;

const IS_LOCAL = (process.env.NEXT_PUBLIC_IMAGE_BACKEND ?? process.env.IMAGE_BACKEND) === "local";
const DEBOUNCE_MS = 800;

type Metadata = Record<
  string,
  {
    key: string;
    width: number;
    height: number;
    aspectRatio: number;
    existsInS3: boolean;
  }
>;

async function loadMetadata(): Promise<Metadata> {
  try {
    const txt = await readFile(METADATA_PATH, "utf8");
    return JSON.parse(txt) as Metadata;
  } catch {
    return {};
  }
}

async function saveMetadata(meta: Metadata): Promise<void> {
  await mkdir(dirname(METADATA_PATH), { recursive: true });
  await writeFile(METADATA_PATH, JSON.stringify(meta, null, 2));
}

function keyFor(absPath: string): string {
  return "assets/" + relative(ASSETS_ROOT, absPath);
}

async function getDimensions(absPath: string): Promise<{ width: number; height: number } | null> {
  try {
    const m = await sharp(absPath).metadata();
    if (m.width && m.height) return { width: m.width, height: m.height };
  } catch (e) {
    console.warn(`  [watch] sharp failed on ${absPath}:`, (e as Error).message);
  }
  return null;
}

async function uploadToS3(
  absPath: string,
  key: string,
  dims: { width: number; height: number },
): Promise<boolean> {
  try {
    const Body = await readFile(absPath);
    await createS3Client().send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body,
        ContentType: mime.getType(absPath) ?? undefined,
        Metadata: {
          width: String(dims.width),
          height: String(dims.height),
          aspectRatio: String(dims.width / dims.height),
        },
      }),
    );
    return true;
  } catch (e) {
    console.error(`  [watch] upload FAILED ${key}:`, (e as Error).message);
    return false;
  }
}

// Debounce per-file to collapse burst writes (Obsidian paste, Finder copy,
// macOS Preview save, etc) into a single handler invocation.
const pending = new Map<string, NodeJS.Timeout>();
function schedule(absPath: string, handler: () => Promise<void>) {
  const existing = pending.get(absPath);
  if (existing) clearTimeout(existing);
  pending.set(
    absPath,
    setTimeout(async () => {
      pending.delete(absPath);
      try {
        await handler();
      } catch (e) {
        console.error(`  [watch] handler error for ${absPath}:`, e);
      }
    }, DEBOUNCE_MS),
  );
}

let metadata: Metadata = {};
let metaSaveTimer: NodeJS.Timeout | null = null;
function queueMetaSave() {
  if (metaSaveTimer) clearTimeout(metaSaveTimer);
  metaSaveTimer = setTimeout(() => {
    metaSaveTimer = null;
    saveMetadata(metadata).catch((e) => console.error("  [watch] metadata save failed:", e));
  }, 200);
}

async function handleUpsert(absPath: string) {
  if (!IMAGE_RE.test(absPath)) return;
  const key = keyFor(absPath);
  const dims = await getDimensions(absPath);
  if (!dims) return;

  const existing = metadata[key];
  const sameDims = existing && existing.width === dims.width && existing.height === dims.height;

  if (IS_LOCAL) {
    // No S3 upload in local mode — MinIO reads directly from the FS.
    if (!sameDims || !existing) {
      metadata[key] = {
        key,
        width: dims.width,
        height: dims.height,
        aspectRatio: dims.width / dims.height,
        existsInS3: Boolean(existing?.existsInS3),
      };
      queueMetaSave();
      console.log(`  [watch] updated metadata for ${key}`);
    }
    return;
  }

  // Cloud mode: upload if new or changed.
  if (existing?.existsInS3 && sameDims) return;
  const uploaded = await uploadToS3(absPath, key, dims);
  metadata[key] = {
    key,
    width: dims.width,
    height: dims.height,
    aspectRatio: dims.width / dims.height,
    existsInS3: uploaded,
  };
  queueMetaSave();
  if (uploaded) console.log(`  [watch] uploaded ${key}`);
}

async function main() {
  metadata = await loadMetadata();
  const mode = IS_LOCAL ? "local (metadata only, no uploads)" : "cloud (S3 uploads enabled)";
  console.log(`Watching ${ASSETS_ROOT}  [${mode}]`);

  const watcher = chokidar.watch(ASSETS_ROOT, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 400,
      pollInterval: 100,
    },
  });

  watcher.on("add", (p) => schedule(p, () => handleUpsert(p)));
  watcher.on("change", (p) => schedule(p, () => handleUpsert(p)));
  watcher.on("error", (e) => console.error("  [watch] error:", e));
  watcher.on("ready", () => console.log("  [watch] initial scan complete, watching for changes…"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

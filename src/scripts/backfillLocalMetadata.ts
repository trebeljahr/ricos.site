/**
 * Scan src/content/Notes/assets for images not yet in metadata.json and
 * add entries with dimensions probed from disk via sharp. Offline, fast,
 * no S3 calls — `existsInS3` defaults to false for new entries.
 *
 * Use when build fails with "Failed to get image dimensions" because files
 * were added to the Notes submodule but metadata.json wasn't refreshed.
 *
 * Build-pipeline safety:
 *   - Always exits 0 unless something genuinely catastrophic happened,
 *     so wiring this into `prebuild` never breaks Vercel / Docker / CI
 *     builds when the Notes submodule isn't initialized.
 *   - Skips silently when metadata.json or the assets dir isn't there.
 *   - Tolerates read-only filesystems (logs and continues).
 */
import "dotenv/config";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { relative } from "node:path";
import { cwd } from "node:process";
import chokidar from "chokidar";
import sharp from "sharp";

const METADATA_PATH = resolve(cwd(), "src/content/Notes/_data/metadata.json");
const ASSETS_ROOT = resolve(cwd(), "src/content/Notes/assets");
const IMAGE_RE = /\.(jpg|jpeg|png|webp|gif|avif)$/i;

type Entry = {
  key: string;
  width: number;
  height: number;
  aspectRatio: number;
  existsInS3: boolean;
  alt?: string;
  altSource?: "manual" | "generated" | "ai";
};

async function probeDims(p: string) {
  try {
    const m = await sharp(p).metadata();
    if (m.width && m.height) return { width: m.width, height: m.height };
  } catch {
    /* ignore */
  }
  return null;
}

async function listAssetFiles(): Promise<string[]> {
  // chokidar is already a dep — use it as a one-shot recursive scanner.
  const paths: string[] = [];
  await new Promise<void>((resolvePromise) => {
    const watcher = chokidar.watch(ASSETS_ROOT, {
      ignoreInitial: false,
      persistent: false,
    });
    watcher.on("add", (p) => {
      if (IMAGE_RE.test(p)) paths.push(p);
    });
    watcher.on("ready", async () => {
      await watcher.close();
      resolvePromise();
    });
  });
  return paths;
}

async function main() {
  // Bail early on build-pipeline hosts (Vercel, Docker, CI) where the Notes
  // submodule may not be initialized. Better to no-op than to break the build.
  if (!existsSync(METADATA_PATH)) {
    console.log(
      `backfillLocalMetadata: skipping — ${METADATA_PATH} not present (Notes submodule probably uninitialized).`,
    );
    return;
  }
  if (!existsSync(ASSETS_ROOT)) {
    console.log(
      `backfillLocalMetadata: skipping — ${ASSETS_ROOT} not present.`,
    );
    return;
  }

  const raw = await readFile(METADATA_PATH, "utf8");
  const meta = JSON.parse(raw) as Record<string, Entry>;

  console.log("Scanning src/content/Notes/assets …");
  const files = await listAssetFiles();
  console.log(`  found ${files.length} image files on disk`);

  let added = 0;
  let skipped = 0;
  for (const abs of files) {
    const key = "assets/" + relative(ASSETS_ROOT, abs);
    if (meta[key]) {
      skipped++;
      continue;
    }
    const dims = await probeDims(abs);
    if (!dims) {
      console.warn(`  could not probe dims: ${key}`);
      continue;
    }
    meta[key] = {
      key,
      width: dims.width,
      height: dims.height,
      aspectRatio: dims.width / dims.height,
      existsInS3: false,
    };
    added++;
  }

  if (added === 0) {
    console.log(
      `backfillLocalMetadata: nothing to do (${skipped}/${files.length} already indexed).`,
    );
    return;
  }
  try {
    await writeFile(METADATA_PATH, JSON.stringify(meta, null, 2) + "\n");
  } catch (e) {
    // Read-only filesystems on some hosted CI platforms — log and move on.
    console.warn(
      `backfillLocalMetadata: couldn't write ${METADATA_PATH} (${(e as Error).message}); continuing.`,
    );
    return;
  }
  console.log(
    `backfillLocalMetadata: +${added} new entries, ${skipped} already present (${Object.keys(meta).length} total)`,
  );
  console.log(
    "Run `npm run syncImageAlt -- --include-photography` next to fill alt text for the new entries.",
  );
}

main().catch((e) => {
  // Never fail the build pipeline. Surface the error for inspection but
  // exit 0 so prebuild hooks remain safe in CI.
  console.warn("backfillLocalMetadata: unexpected error, continuing build:", e);
});

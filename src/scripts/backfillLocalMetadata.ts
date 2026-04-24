/**
 * Scan src/content/Notes/assets for images not yet in metadata.json and
 * add entries with dimensions probed from disk via sharp. Offline, fast,
 * no S3 calls — `existsInS3` defaults to false for new entries.
 *
 * Use when build fails with "Failed to get image dimensions" because files
 * were added to the Notes submodule but metadata.json wasn't refreshed.
 */
import "dotenv/config";
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

  await writeFile(METADATA_PATH, JSON.stringify(meta, null, 2) + "\n");
  console.log(
    `backfillLocalMetadata: +${added} new entries, ${skipped} already present (${Object.keys(meta).length} total)`,
  );
  if (added > 0) {
    console.log(
      "Run `npm run syncImageAlt -- --include-photography` next to fill alt text for the new entries.",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

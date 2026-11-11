/**
 * Fail when an image that can reach the public reveals where it was taken.
 *
 * Originals keep their GPS on purpose, so photos can be grouped by place later.
 * They stay in the git-ignored Notes assets and the private source bucket. The
 * public only gets WebP variants, which the resize step writes without metadata,
 * and files committed to this repo, which GitHub and /public serve as they are.
 * Git history keeps a committed file forever, so the check has to run before the
 * commit: lint-staged calls this script with the staged images.
 *
 *   tsx src/scripts/checkImageGps.ts                  every git-tracked image
 *   tsx src/scripts/checkImageGps.ts a.jpg b.png      only these files
 *   tsx src/scripts/checkImageGps.ts --served         newest 2,000 variants on CloudFront
 *   tsx src/scripts/checkImageGps.ts --served=all     every variant on CloudFront
 *
 * To clear a file and keep its other EXIF: exiftool -overwrite_original -gps:all= <file>
 */
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import pLimit from "p-limit";
import { imageHasGps, WEBP_HEADER_BYTES, webpMayCarryMetadata } from "src/lib/imageGps";
import { listAllObjects } from "src/scripts/drift/lib/buckets";

const RESIZED_BUCKET = "images.trebeljahr.com.resized";
const VARIANTS_URL =
  process.env.NEXT_PUBLIC_IMAGE_CDN_URL?.replace(/\/$/, "") || "https://assets.ricos.site";
const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|heic|heif|tiff?|dng)$/i;
const NEWEST_VARIANTS = 2000;

function trackedImages(): string[] {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 1 << 28 })
    .split("\0")
    .filter((file) => IMAGE_RE.test(file));
}

async function checkFiles(files: string[]): Promise<string[]> {
  const limit = pLimit(16);
  const hits = await Promise.all(
    files.map((file) => limit(async () => imageHasGps(await readFile(file)))),
  );
  return files.filter((_, i) => hits[i]);
}

async function variantMayCarryMetadata(key: string): Promise<boolean> {
  const path = key.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${VARIANTS_URL}/${path}`, {
    headers: { Range: `bytes=0-${WEBP_HEADER_BYTES - 1}` },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${key}`);
  return webpMayCarryMetadata(new Uint8Array(await response.arrayBuffer()));
}

async function checkServed(all: boolean): Promise<string[]> {
  const objects = await listAllObjects(RESIZED_BUCKET);
  objects.sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0));
  const keys = objects.slice(0, all ? undefined : NEWEST_VARIANTS).map(({ Key }) => Key);
  console.log(`Checking ${keys.length} of ${objects.length} variants through ${VARIANTS_URL}...`);

  const limit = pLimit(32);
  const hits = await Promise.all(keys.map((key) => limit(() => variantMayCarryMetadata(key))));
  return keys.filter((_, i) => hits[i]);
}

const args = process.argv.slice(2);
const served = args.find((arg) => arg.startsWith("--served"));
const files = args.length > 0 ? args.filter((file) => IMAGE_RE.test(file)) : trackedImages();

const offenders = served ? await checkServed(served === "--served=all") : await checkFiles(files);

if (offenders.length > 0) {
  console.error(
    served
      ? `${offenders.length} served variants may carry metadata:`
      : `${offenders.length} images carry a GPS position:`,
  );
  for (const offender of offenders) console.error(`  ${offender}`);
  if (!served) console.error("Clear them with: exiftool -overwrite_original -gps:all= <file>");
  process.exit(1);
}
console.log(served ? "No served variant carries metadata." : `No GPS in ${files.length} images.`);

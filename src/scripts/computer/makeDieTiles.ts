// Cuts a very large die photo into zoom tiles for the DieZoom demo.
//
//   pnpm tsx src/scripts/computer/makeDieTiles.ts <photo.jpg> <out dir>
//
// Every tile is its own 640 × 640 JPEG under <out dir>/<level>/<column>_<row>.jpg,
// so the image pipeline serves each one like any other asset
// (/assets/…/<column>_<row>/640.webp, in dev and on CloudFront). The pipeline
// never serves a raw file, and it scales a source to the requested width, so
// tiles at the right and bottom edges are padded to the full 640 × 640.
// Level 0 is the smallest that is still at least one tile wide; the last level
// is the photo at full size. manifest.json describes the levels.

import { mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TILE = 640;
const QUALITY = 84;

async function main() {
  const [input, outDir] = process.argv.slice(2);
  if (!input || !outDir) throw new Error("Usage: makeDieTiles <photo> <out dir>");

  sharp.cache(false);
  const source = sharp(input, { limitInputPixels: false });
  const { width = 0, height = 0 } = await source.metadata();
  const scratch = path.join(outDir, ".dz");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(scratch, { recursive: true });

  // libvips writes a Deep Zoom pyramid: level n is the photo halved (N - n)
  // times, N = ceil(log2(max side)), with smaller tiles at the edges.
  await sharp(input, { limitInputPixels: false })
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .tile({ size: TILE, overlap: 0, layout: "dz" })
    .toFile(path.join(scratch, "die.dz"));

  const pyramid = path.join(scratch, "die_files");
  const top = Math.ceil(Math.log2(Math.max(width, height)));
  const levels: { level: number; width: number; height: number; columns: number; rows: number }[] =
    [];
  const names = (await readdir(pyramid)).filter((name) => /^\d+$/.test(name));
  for (const name of names.sort((a, b) => Number(a) - Number(b))) {
    const dzLevel = Number(name);
    const scale = 2 ** (top - dzLevel);
    const levelWidth = Math.ceil(width / scale);
    const levelHeight = Math.ceil(height / scale);
    if (levelWidth < TILE / 2) continue;
    const level = levels.length;
    const columns = Math.ceil(levelWidth / TILE);
    const rows = Math.ceil(levelHeight / TILE);
    const target = path.join(outDir, String(level));
    await mkdir(target, { recursive: true });
    for (const file of await readdir(path.join(pyramid, name))) {
      const [column, row] = file
        .replace(/\.jpe?g$/, "")
        .split("_")
        .map(Number);
      const from = path.join(pyramid, name, file);
      const to = path.join(target, `${column}_${row}.jpg`);
      const tile = await sharp(from).metadata();
      if (tile.width === TILE && tile.height === TILE) {
        await rename(from, to);
        continue;
      }
      await sharp(from)
        .extend({
          right: TILE - (tile.width ?? TILE),
          bottom: TILE - (tile.height ?? TILE),
          background: "#000000",
        })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toFile(to);
    }
    levels.push({ level, width: levelWidth, height: levelHeight, columns, rows });
    console.info(`level ${level}: ${levelWidth}×${levelHeight}, ${columns}×${rows} tiles`);
  }
  await rm(scratch, { recursive: true, force: true });
  await writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify({ width, height, tileSize: TILE, levels }, null, 2)}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

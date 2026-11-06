// Writes ../manifest.json: every marketing image with its pixel size, bytes,
// SHA-256, source and capture date. Run after capturing or rendering.
//
//   node <this folder>/write-manifest.mjs
import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { baseUrl, shots } from "./shots.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

// Pixel size from the PNG IHDR chunk or the first JPEG SOF marker.
function imageSize(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47)
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  let i = 2;
  while (i < buf.length) {
    const marker = buf[i + 1];
    const length = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
    }
    i += 2 + length;
  }
  return null;
}

async function describe(folder, file, source) {
  const path = join(root, folder, file);
  const buf = await readFile(path);
  const { mtime } = await stat(path);
  return {
    file: `${folder}/${file}`,
    ...imageSize(buf),
    bytes: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
    date: mtime.toISOString().slice(0, 10),
    source,
  };
}

const images = [];
for (const file of (await readdir(join(root, "screenshots"))).sort()) {
  const shot = shots.find((s) => `${s.name}.jpg` === file);
  const source = shot
    ? {
        url: `${baseUrl}${shot.path}`,
        viewport: `${shot.viewport.width}x${shot.viewport.height}`,
        deviceScaleFactor: 2,
        theme: shot.theme ?? null,
        tool: "docs/marketing/scripts/capture-screenshots.mjs (Playwright Chromium)",
      }
    : { note: "not in shots.mjs" };
  images.push(await describe("screenshots", file, source));
}
for (const file of (await readdir(join(root, "social-preview"))).sort()) {
  const match = file.match(/^social-preview-([a-z])\.png$/);
  if (!match) continue;
  images.push(
    await describe("social-preview", file, {
      template: `social-preview/template.html?v=${match[1]}`,
      tool: "docs/marketing/scripts/render-social-preview.mjs (Playwright Chromium)",
    }),
  );
}
await writeFile(join(root, "manifest.json"), `${JSON.stringify({ images }, null, 2)}\n`);
console.log(`manifest.json: ${images.length} images`);

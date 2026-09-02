/**
 * Generates `public/og-default.png` — the site-wide fallback share card used by
 * `<OpenGraph>` whenever a page has no cover image of its own (imprint, privacy,
 * donate, galleries without a hero shot, …).
 *
 * Run with: npx tsx src/scripts/generateDefaultOgImage.ts
 * The output is committed, so this only needs re-running when the card changes.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;

// Matches the site chrome: `dark:bg-gray-900` body + the `myBlue` accent from
// tailwind.config.cjs.
const BACKGROUND = "#111827";
const MY_BLUE = "rgb(68, 160, 255)";
const LIGHT_BLUE = "rgb(153, 204, 255)";

const FONT_STACK = "Helvetica Neue, Helvetica, Arial, sans-serif";

const background = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="18%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${MY_BLUE}" stop-opacity="0.28" />
      <stop offset="100%" stop-color="${MY_BLUE}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${BACKGROUND}" />
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#glow)" />
  <rect x="0" y="${HEIGHT - 10}" width="${WIDTH}" height="10" fill="${MY_BLUE}" />
</svg>`;

const text = `
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <text x="420" y="286" font-family="${FONT_STACK}" font-size="96" font-weight="700" fill="#ffffff">ricos.site</text>
  <text x="420" y="352" font-family="${FONT_STACK}" font-size="36" font-weight="400" fill="${LIGHT_BLUE}">Rico Trebeljahr</text>
  <text x="420" y="416" font-family="${FONT_STACK}" font-size="30" font-weight="400" fill="#9ca3af">Essays, photography, notes and Three.js experiments</text>
</svg>`;

async function main() {
  const iconPath = resolve(process.cwd(), "public/favicon/android-chrome-512x512.png");
  const icon = await sharp(readFileSync(iconPath)).resize(240, 240).png().toBuffer();

  const outPath = resolve(process.cwd(), "public/og-default.png");

  await sharp(Buffer.from(background))
    .composite([
      { input: icon, left: 130, top: 195 },
      { input: Buffer.from(text), left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  const { width, height } = await sharp(outPath).metadata();
  console.log(`wrote ${outPath} (${width}x${height})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

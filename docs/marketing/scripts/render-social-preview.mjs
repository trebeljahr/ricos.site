// Renders the GitHub social preview options from social-preview/template.html.
//
//   npx -y -p playwright@1.64.0 -c 'node docs/marketing/scripts/render-social-preview.mjs'
//   ... render-social-preview.mjs --review=/path/to/review-sheet.jpg
//
// Writes social-preview/social-preview-{a,b,c}.png at 1280x640. GitHub wants
// under 1 MB; the script fails if a file is larger. --review also writes a
// side-by-side sheet of the three options, labelled A, B and C.
import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadChromium } from "./load-playwright.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "social-preview");
const template = pathToFileURL(join(dir, "template.html")).href;
const review = process.argv.find((a) => a.startsWith("--review="))?.slice(9);
const variants = ["a", "b", "c"];
const maxBytes = 1024 * 1024;

const chromium = await loadChromium();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 640 },
    deviceScaleFactor: 1,
  });
  const files = [];
  for (const v of variants) {
    await page.goto(`${template}?v=${v}`, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
    });
    const file = join(dir, `social-preview-${v}.png`);
    await page.screenshot({ path: file, type: "png" });
    const { size } = await stat(file);
    console.log(`${v}: ${file} (${Math.round(size / 1024)} KB)`);
    if (size > maxBytes) throw new Error(`${file} is over 1 MB`);
    files.push(file);
  }

  if (review) {
    const images = await Promise.all(files.map((f) => readFile(f, "base64")));
    const tiles = images
      .map(
        (b64, i) =>
          `<figure><figcaption>${variants[i].toUpperCase()}</figcaption><img src="data:image/png;base64,${b64}"></figure>`,
      )
      .join("");
    const sheet = await browser.newPage({
      viewport: { width: 1980, height: 400 },
      deviceScaleFactor: 1,
    });
    await sheet.setContent(
      `<style>
        body{margin:0;padding:24px;background:#e5e7eb;font:600 28px/1 -apple-system,Helvetica,Arial,sans-serif;display:flex;gap:24px}
        figure{margin:0;width:632px}figcaption{margin:0 0 12px}img{width:632px;height:316px;display:block;box-shadow:0 2px 10px rgba(0,0,0,.25)}
      </style>${tiles}`,
      { waitUntil: "load" },
    );
    await sheet.screenshot({ path: review, type: "jpeg", quality: 88, fullPage: true });
    console.log(`review sheet: ${review}`);
  }
} finally {
  await browser.close();
}

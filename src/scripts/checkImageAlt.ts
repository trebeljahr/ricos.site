/**
 * Fail the build when a rendered image ships without usable alt text.
 *
 * Three failure modes, all of which reached production before this existed:
 *   - no `alt` attribute at all (React renders the element without one),
 *   - `alt=""` on a content image (velite happily accepted `alt: ""`),
 *   - alt that is really a filename — `PXL_20240929_162803715~2`, `DSC06512`,
 *     `Screenshot_20260423-142611`, a bare `12`. Obsidian writes these when an
 *     image is pasted, and because a markdown alt overrides the description in
 *     `_data/metadata.json`, a junk alt actively hides a good one.
 *
 * Like checkInternalLinks this reads the built HTML rather than the sources, so
 * it sees whatever the pages actually emit no matter which render path produced
 * it. It runs in `postbuild`; without `.next` it skips instead of failing, so
 * `npm run checkAlt` on a cold tree is a no-op.
 */

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { glob } from "glob";

const ROOT = process.cwd();
const PAGES_DIR = resolve(ROOT, ".next/server/pages");

const IMG_TAG = /<img\b[^>]*>/g;
const ALT_ATTR = /\balt="([^"]*)"/;
const SRC_ATTR = /\bsrc="([^"]*)"/;

/**
 * Alt text that is a camera or screenshot filename rather than a description.
 * Deliberately narrow: it must not fire on prose that merely contains a number.
 */
const FILENAME_ALT = [
  /^\d{1,3}$/, // "1", "42" — Obsidian's numbered paste
  /(?:PXL|IMG|DSC|DSCF|MVIMG|PANO)[-_ ]?\d{4}/i,
  /screenshot[-_ ]?\d/i,
  /^pasted image/i,
  /\.(?:jpe?g|png|webp|gif|avif|heic)\b/i,
  /_\d{8}[-_]\d{6}/, // 20240929_162803
];

type Finding = { page: string; kind: string; alt: string; src: string };

function describe(src: string): string {
  const decoded = src.replace(/&#x2F;/g, "/").replace(/&amp;/g, "&");
  const match = decoded.match(/\/(assets\/.+?)\/\d+\.(?:webp|avif|png|jpe?g)/);
  return match ? match[1] : decoded.slice(0, 120);
}

async function main() {
  if (!existsSync(PAGES_DIR)) {
    console.log("[checkImageAlt] skipping — no .next build output to inspect.");
    return;
  }

  const files = await glob("**/*.html", { cwd: PAGES_DIR, absolute: true, nodir: true });
  const findings: Finding[] = [];
  let images = 0;

  for (const file of files) {
    const page = relative(PAGES_DIR, file);
    const html = readFileSync(file, "utf-8");

    for (const [tag] of html.matchAll(IMG_TAG)) {
      images++;
      const src = describe(tag.match(SRC_ATTR)?.[1] ?? "");
      const altMatch = tag.match(ALT_ATTR);

      if (!altMatch) {
        findings.push({ page, kind: "no alt attribute", alt: "", src });
        continue;
      }

      const alt = altMatch[1].trim();
      if (alt.length === 0) {
        findings.push({ page, kind: "empty alt", alt, src });
        continue;
      }
      if (FILENAME_ALT.some((pattern) => pattern.test(alt))) {
        findings.push({ page, kind: "filename as alt", alt, src });
      }
    }
  }

  if (findings.length === 0) {
    console.log(`[checkImageAlt] ${images} rendered images all carry descriptive alt text.`);
    return;
  }

  console.error(`\n[checkImageAlt] ${findings.length} image(s) without usable alt text:\n`);
  for (const { page, kind, alt, src } of findings) {
    console.error(`  ${page}\n      ${kind}: ${alt ? `"${alt}"` : "(none)"}\n      ${src}`);
  }
  console.error(
    "\nFix at the source, not at the render site:\n" +
      "  - cover images: set `cover.alt` in the entry's frontmatter\n" +
      "  - markdown images: write `![](...)` with an empty alt and let the description in\n" +
      "    src/content/Notes/_data/metadata.json apply — a junk alt in the markdown overrides it\n" +
      "  - missing descriptions: add them to metadata.json via `npm run syncImageAlt`\n",
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

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
 *
 * The component half of this is also caught before a commit: the Biome plugin
 * biome-plugins/decorative-image-alt.grit flags any JSX `alt=""` that is not
 * also `aria-hidden`, which is the case that kept failing Vercel builds.
 */

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { glob } from "glob";

const ROOT = process.cwd();
const PAGES_DIR = resolve(ROOT, ".next/server/pages");

const IMG_TAG = /<img\b[^>]*>/g;
const ALT_ATTR = /\balt="([^"]*)"/;
const SRC_ATTR = /\bsrc="([^"]*)"/;
/** Decorative images (e.g. Card's blurred letterbox backdrop) opt out explicitly. */
const DECORATIVE = /\baria-hidden="true"|\brole="presentation"/;

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

/** Enough to act on; past this the log is noise again. */
const MAX_LINES = 30;
const EXAMPLES = 3;

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
      if (DECORATIVE.test(tag)) continue;
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

  // Grouped, not one line per <img>: a shared component (the navbar logo, an
  // emoji sprite) repeats on all ~500 pages, and one page can emit hundreds
  // (every tile of /photography/spectrum). Either way it is a single fix, and
  // printing each copy buried the content image that really needed one.
  const label = ({ kind, alt }: Finding) => `${kind}${alt ? ` "${alt}"` : ""}`;
  const pagesByImage = new Map<string, { finding: Finding; pages: Set<string> }>();
  for (const finding of findings) {
    const key = `${label(finding)}\0${finding.src}`;
    const entry = pagesByImage.get(key) ?? { finding, pages: new Set<string>() };
    entry.pages.add(finding.page);
    pagesByImage.set(key, entry);
  }

  const lines: { count: number; text: string }[] = [];
  const byPage = new Map<string, Finding[]>();
  for (const { finding, pages } of pagesByImage.values()) {
    if (pages.size > 1) {
      const examples = [...pages].slice(0, EXAMPLES).join(", ");
      lines.push({
        count: pages.size,
        text: `${label(finding)}: ${finding.src}\n      on ${pages.size} pages, e.g. ${examples}`,
      });
      continue;
    }
    const key = `${finding.page}\0${finding.kind}`;
    byPage.set(key, [...(byPage.get(key) ?? []), finding]);
  }
  for (const group of byPage.values()) {
    const [{ page, kind }] = group;
    const examples = group
      .slice(0, EXAMPLES)
      .map((f) => (f.alt ? `"${f.alt}" ${f.src}` : f.src))
      .join("\n        ");
    lines.push({
      count: group.length,
      text:
        group.length === 1
          ? `${label(group[0])}: ${group[0].src}\n      on ${page}`
          : `${kind}: ${group.length} images on ${page}, e.g.\n        ${examples}`,
    });
  }
  lines.sort((a, b) => b.count - a.count);

  console.error(
    `\n[checkImageAlt] ${findings.length} rendered image(s) without usable alt text, in ${lines.length} group(s):\n`,
  );
  for (const { text } of lines.slice(0, MAX_LINES)) console.error(`  ${text}`);
  if (lines.length > MAX_LINES) console.error(`  …and ${lines.length - MAX_LINES} more groups`);
  console.error(
    "\nFix at the source, not at the render site:\n" +
      "  - cover images: set `cover.alt` in the entry's frontmatter\n" +
      "  - markdown images: write `![](...)` with an empty alt and let the description in\n" +
      "    src/content/Notes/_data/metadata.json apply — a junk alt in the markdown overrides it\n" +
      "  - missing descriptions: add them to metadata.json via `npm run syncImageAlt`\n" +
      "  - decorative images (a logo inside a labelled button, an emoji sprite): keep\n" +
      '    `alt=""` and add `aria-hidden="true"`\n',
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

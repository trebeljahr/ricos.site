/**
 * Shared reference extraction for the link checker.
 *
 * Every subcommand works off the same three buckets, pulled from the same
 * sources, so a fix to the extraction (a new file glob, a new href shape)
 * lands everywhere at once:
 *
 *   - `routes`   — absolute internal links that should resolve to a page,
 *   - `relative` — markdown links missing their leading slash,
 *   - `assets`   — references to a file under public/,
 *   - `external` — http(s) links, for the opt-in network check.
 */

import { readFileSync } from "node:fs";
import { dirname, posix, relative as relativePath, resolve } from "node:path";
import { glob } from "glob";
import matter from "gray-matter";

export const ROOT = process.cwd();
export const CONTENT_DIR = resolve(ROOT, "src/content/Notes");
export const PUBLIC_DIR = resolve(ROOT, "public");

/** Paths that never resolve to a page route and never map to a file on disk. */
const IGNORED_ROUTE_PREFIXES = ["/api/", "/_next/", "/static/"];

/**
 * `/assets/**` is the S3/CloudFront-backed image tree: gitignored locally and
 * rewritten by image-loader.js, so there is nothing on disk to stat.
 * `/_next/**` is emitted by the bundler with content hashes we do not model.
 */
const IGNORED_ASSET_PREFIXES = ["/assets/", "/_next/"];

const FILE_EXTENSION = /\.[a-z0-9]{2,12}$/i;

export type Reference = {
  href: string;
  file: string;
  line: number;
  /** A markdown link, which the content build resolves through the redirect table. */
  markdown?: boolean;
};

export type References = {
  routes: Reference[];
  relative: Reference[];
  assets: Reference[];
  external: Reference[];
};

export function lineOf(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (source[i] === "\n") line++;
  return line;
}

// `[text](/href)` and `![alt](/href)` — the leading `!` is captured so images
// can be routed to the asset bucket instead of the route bucket.
export const MARKDOWN_LINK = /(!?)\[[^\]]*\]\(\s*([^)\s]+)/g;
// `href="/x"`, `href={"/x"}` and object literals such as `href: "/x"`.
export const JSX_HREF = /href\s*[:=]\s*\{?\s*["'`]([^"'`]+)["'`]/g;
// `src="/x"` on img/script/source elements, same shapes as above.
export const JSX_SRC = /src\s*[:=]\s*\{?\s*["'`]([^"'`]+)["'`]/g;
// `url(/x)`, `url("../x")` in stylesheets.
export const CSS_URL = /url\(\s*["']?([^"')]+)["']?\s*\)/g;

export function extract(source: string, file: string, regexes: [RegExp, number][]): Reference[] {
  const references: Reference[] = [];
  for (const [regex, group] of regexes) {
    regex.lastIndex = 0;
    let match = regex.exec(source);
    while (match !== null) {
      references.push({ href: match[group], file, line: lineOf(source, match.index) });
      match = regex.exec(source);
    }
  }
  return references;
}

export function isExternal(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);
}

export function isHttp(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** `/photography/${tripName}` only resolves at runtime. */
export function isInterpolated(href: string): boolean {
  return href.includes("${");
}

/**
 * Strip the fragment, query and any trailing slash so a href can be compared
 * against manifest routes. Returns undefined for hrefs that are not routes.
 */
export function normalizeRoute(href: string): string | undefined {
  const path = href.split("#")[0].split("?")[0].trim();
  if (!path || path === "/") return path || undefined;
  if (IGNORED_ROUTE_PREFIXES.some((prefix) => path.startsWith(prefix))) return undefined;
  if (FILE_EXTENSION.test(path)) return undefined;
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

/** The public/-relative path an asset reference points at, or undefined. */
export function normalizeAsset(href: string): string | undefined {
  const path = href.split("#")[0].split("?")[0].trim();
  if (!path.startsWith("/")) return undefined;
  if (!FILE_EXTENSION.test(path)) return undefined;
  if (IGNORED_ASSET_PREFIXES.some((prefix) => path.startsWith(prefix))) return undefined;
  return path;
}

const MARKDOWN_GLOBS = [
  "posts/*.md",
  "booknotes/*.md",
  "newsletters/*.md",
  "podcastnotes/*.md",
  "pages/*.md",
  "travel/**/*.md",
  "website-section-descriptions/*.md",
];
const SOURCE_GLOBS = ["src/pages/**/*.tsx", "src/components/**/*.tsx"];
const STYLESHEET_GLOBS = ["src/styles/**/*.css", "public/**/*.css"];

export async function collectReferences(): Promise<References> {
  const markdown = await glob(MARKDOWN_GLOBS, { cwd: CONTENT_DIR, absolute: true });
  const source = await glob(SOURCE_GLOBS, { cwd: ROOT, absolute: true });
  const stylesheets = await glob(STYLESHEET_GLOBS, { cwd: ROOT, absolute: true });

  const result: References = { routes: [], relative: [], assets: [], external: [] };

  /** `image` references can only be assets; they never denote a page route. */
  const sort = (references: Reference[], image = false) => {
    for (const reference of references) {
      const { href } = reference;
      if (isInterpolated(href)) continue;
      if (isHttp(href)) {
        result.external.push(reference);
        continue;
      }
      if (isExternal(href)) continue;
      if (href.startsWith("/")) {
        const asset = normalizeAsset(href);
        if (asset) result.assets.push({ ...reference, href: asset });
        else if (!image) result.routes.push(reference);
      }
      // A markdown link like `booknotes/pixar` resolves against the current
      // URL, not the site root, so it is a bug even when the target exists.
      else if (href.includes("/") && !image) result.relative.push(reference);
    }
  };

  for (const file of markdown) {
    const raw = readFileSync(file, "utf-8");
    // Drafts may legitimately link to other drafts; only shipped pages matter.
    if (matter(raw).data.published === false) continue;
    const relativeFile = relativePath(ROOT, file);
    const links: Reference[] = [];
    const images: Reference[] = [];
    MARKDOWN_LINK.lastIndex = 0;
    let match = MARKDOWN_LINK.exec(raw);
    while (match !== null) {
      const image = match[1] === "!";
      const reference = { href: match[2], file: relativeFile, line: lineOf(raw, match.index) };
      if (image) images.push(reference);
      else links.push({ ...reference, markdown: true });
      match = MARKDOWN_LINK.exec(raw);
    }
    sort(links);
    sort(images, true);
  }

  for (const file of source) {
    const raw = readFileSync(file, "utf-8");
    const relativeFile = relativePath(ROOT, file);
    sort(
      extract(raw, relativeFile, [
        [JSX_HREF, 1],
        [JSX_SRC, 1],
      ]),
    );
  }

  // Stylesheet url() is relative to the stylesheet, which is exactly the bug
  // the KaTeX font 404 was: fonts/KaTeX_*.woff2 next to public/katex/*.css.
  for (const file of stylesheets) {
    const raw = readFileSync(file, "utf-8");
    const relativeFile = relativePath(ROOT, file);
    const inPublic = file.startsWith(`${PUBLIC_DIR}/`);
    for (const reference of extract(raw, relativeFile, [[CSS_URL, 1]])) {
      const { href } = reference;
      if (isHttp(href)) {
        result.external.push(reference);
        continue;
      }
      if (isExternal(href) || href.startsWith("data:")) continue;
      const absolute = href.startsWith("/")
        ? href
        : inPublic
          ? posix.resolve(`/${relativePath(PUBLIC_DIR, dirname(file))}`, href)
          : undefined;
      if (!absolute) continue;
      const asset = normalizeAsset(absolute);
      if (asset) result.assets.push({ ...reference, href: asset });
    }
  }

  return result;
}

/**
 * Fail the build when a published page links to a route that does not exist.
 *
 * The recurring bug this guards against: a link points at content whose
 * frontmatter still says `published: false`, so velite emits it but
 * getStaticPaths filters it out and the URL 404s in production. Slug typos and
 * markdown links missing their leading slash fall in the same bucket.
 *
 * Routes are read from the Next.js build manifests rather than re-derived from
 * the content, so the check compares links against the pages the build
 * actually produced. It therefore runs in `postbuild`; without `.next` it
 * skips instead of failing, so `npm run checkLinks` on a cold tree is a no-op.
 */

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { glob } from "glob";
import matter from "gray-matter";

const ROOT = process.cwd();
const NEXT_DIR = resolve(ROOT, ".next");
const CONTENT_DIR = resolve(ROOT, "src/content/Notes");

// Paths that never resolve to a page route.
const IGNORED_PREFIXES = ["/api/", "/assets/", "/_next/", "/static/"];
const FILE_EXTENSION = /\.[a-z0-9]{2,12}$/i;

type Manifests = {
  exact: Set<string>;
  patterns: RegExp[];
};

function readJson<T>(path: string): T | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

/**
 * Every URL the build can serve: prerendered pages, non-SSG page routes,
 * redirect sources, and dynamic routes that still render on demand
 * (`fallback` other than `false`, e.g. /r3f/shaders/[shaderName]).
 */
function collectRoutes(): Manifests | undefined {
  type RoutesManifest = {
    staticRoutes?: { page: string }[];
    dynamicRoutes?: { page: string; regex: string }[];
    redirects?: { regex: string }[];
  };
  type PrerenderManifest = {
    routes?: Record<string, unknown>;
    dynamicRoutes?: Record<string, { fallback?: string | false | null }>;
  };

  const routesManifest = readJson<RoutesManifest>(resolve(NEXT_DIR, "routes-manifest.json"));
  const prerenderManifest = readJson<PrerenderManifest>(
    resolve(NEXT_DIR, "prerender-manifest.json"),
  );
  if (!routesManifest || !prerenderManifest) return undefined;

  const exact = new Set<string>();
  for (const route of Object.keys(prerenderManifest.routes ?? {})) exact.add(route);
  for (const { page } of routesManifest.staticRoutes ?? []) exact.add(page);

  const patterns: RegExp[] = [];
  for (const { regex } of routesManifest.redirects ?? []) patterns.push(new RegExp(regex));

  const fallbacks = prerenderManifest.dynamicRoutes ?? {};
  for (const { page, regex } of routesManifest.dynamicRoutes ?? []) {
    // `fallback: false` means the route only serves the paths getStaticPaths
    // returned, which are already in `exact`. Anything else renders on demand.
    if (fallbacks[page]?.fallback === false) continue;
    patterns.push(new RegExp(regex));
  }

  return { exact, patterns };
}

function normalize(href: string): string | undefined {
  const path = href.split("#")[0].split("?")[0].trim();
  if (!path || path === "/") return path || undefined;
  if (IGNORED_PREFIXES.some((prefix) => path.startsWith(prefix))) return undefined;
  if (FILE_EXTENSION.test(path)) return undefined;
  return path.length > 1 ? path.replace(/\/+$/, "") : path;
}

type Link = { href: string; file: string; line: number };

function lineOf(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (source[i] === "\n") line++;
  return line;
}

// `[text](/href)` — images (`![]`) and reference definitions are skipped.
const MARKDOWN_LINK = /(!?)\[[^\]]*\]\(\s*([^)\s]+)/g;
// `href="/x"`, `href={"/x"}` and object literals such as `href: "/x"`.
const JSX_HREF = /href\s*[:=]\s*\{?\s*["'`]([^"'`]+)["'`]/g;

function extract(source: string, file: string, regexes: [RegExp, number][]): Link[] {
  const links: Link[] = [];
  for (const [regex, group] of regexes) {
    regex.lastIndex = 0;
    let match = regex.exec(source);
    while (match !== null) {
      if (!(regex === MARKDOWN_LINK && match[1] === "!")) {
        links.push({ href: match[group], file, line: lineOf(source, match.index) });
      }
      match = regex.exec(source);
    }
  }
  return links;
}

function isExternal(href: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);
}

// `/photography/${tripName}` only resolves at runtime; there is nothing static
// to compare it against.
function isInterpolated(href: string): boolean {
  return href.includes("${");
}

async function collectLinks(): Promise<{ absolute: Link[]; relative: Link[] }> {
  const markdown = await glob(
    [
      "posts/*.md",
      "booknotes/*.md",
      "newsletters/*.md",
      "podcastnotes/*.md",
      "pages/*.md",
      "travel/**/*.md",
      "website-section-descriptions/*.md",
    ],
    { cwd: CONTENT_DIR, absolute: true },
  );
  const source = await glob(["src/pages/**/*.tsx", "src/components/**/*.tsx"], {
    cwd: ROOT,
    absolute: true,
  });

  const absolute: Link[] = [];
  const relativeLinks: Link[] = [];

  const sort = (links: Link[]) => {
    for (const link of links) {
      if (isExternal(link.href) || isInterpolated(link.href)) continue;
      if (link.href.startsWith("/")) absolute.push(link);
      // A markdown link like `booknotes/pixar` resolves against the current
      // URL, not the site root, so it is a bug even when the target exists.
      else if (link.href.includes("/")) relativeLinks.push(link);
    }
  };

  for (const file of markdown) {
    const raw = readFileSync(file, "utf-8");
    // Drafts may legitimately link to other drafts; only shipped pages matter.
    if (matter(raw).data.published === false) continue;
    sort(extract(raw, relative(ROOT, file), [[MARKDOWN_LINK, 2]]));
  }

  for (const file of source) {
    sort(extract(readFileSync(file, "utf-8"), relative(ROOT, file), [[JSX_HREF, 1]]));
  }

  return { absolute, relative: relativeLinks };
}

async function main() {
  const routes = collectRoutes();
  if (!routes) {
    console.log("[checkInternalLinks] no .next manifests — run after `next build`. Skipping.");
    return;
  }

  const { absolute, relative: relativeLinks } = await collectLinks();

  const broken = absolute.filter((link) => {
    const path = normalize(link.href);
    if (path === undefined) return false;
    if (routes.exact.has(path)) return false;
    return !routes.patterns.some((pattern) => pattern.test(path));
  });

  const failures = [...broken, ...relativeLinks];
  if (failures.length === 0) {
    console.log(
      `[checkInternalLinks] ${absolute.length} internal links resolve against ${routes.exact.size} routes.`,
    );
    return;
  }

  console.error(`\n[checkInternalLinks] ${failures.length} broken internal link(s):\n`);
  for (const { href, file, line } of broken) {
    console.error(`  ${file}:${line}  →  ${href}   (no such route)`);
  }
  for (const { href, file, line } of relativeLinks) {
    console.error(`  ${file}:${line}  →  ${href}   (relative link, needs a leading slash)`);
  }
  console.error(
    "\nA link to content with `published: false` in its frontmatter fails here: " +
      "publish the target or drop the link syntax and keep the anchor text.\n",
  );
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

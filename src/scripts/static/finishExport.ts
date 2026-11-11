/**
 * Finish the static export in out/ for the assets-only Cloudflare Worker
 * `ricos-site` (wrangler.jsonc). The last step of `pnpm build`.
 *
 *   tsx src/scripts/static/finishExport.ts [out]
 *
 * - Copies what postbuild wrote to public/ after Next had already copied
 *   public/ into out/: sitemap, robots.txt, the feeds, the search index.
 * - Writes /projects/rss.xml, which an API route answered before.
 * - Writes /version.json ({ commit, notes }) when COMMIT_SHA is set; the
 *   deploy job polls it.
 * - Writes `_redirects` (src/scripts/createRedirects.js) and `_headers`.
 * - Fails on anything the Worker would refuse or serve wrong: a file over
 *   25 MiB, more files than Workers Free takes, too many redirect or header
 *   rules, a redirect that hides a real page, a dev-only page in the export.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { ANNOUNCEMENTS_FEED_PATH } from "src/lib/announcements";
import { announcementsFeed } from "src/lib/announcementsFeed";
import { generateRedirects } from "../createRedirects.js";
import {
  isDynamicRedirect,
  NOINDEX_HOSTS,
  redirectLine,
  SECURITY_HEADERS,
  toCloudflareRedirects,
} from "./routing.mjs";

const OUT = resolve(process.argv[2] ?? "out");
const PUBLIC = resolve("public");

// Workers static assets limits (Free plan):
// https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/
const MAX_FILES = 20_000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_STATIC_REDIRECTS = 2_000;
const MAX_DYNAMIC_REDIRECTS = 100;
const MAX_HEADER_RULES = 100;

/** Written to public/ by postbuild, after `next build` copied public/ to out/. */
const POSTBUILD_FILES = ["robots.txt", "rss.xml", "atom.xml", "feed.json", "search-index.json"];

/**
 * Pages that read private notes under `next dev` (next.config.mjs
 * DEV_ONLY_SERVER_PAGES), and API routes, which only the dev server runs.
 * /dev/alt-review and /dev/needlestack are static shells live today too.
 */
const DEV_ONLY_PATHS = [
  "api",
  "dev/diary.html",
  "dev/diary",
  "computer/demos.html",
  "piano/demos.html",
];

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, found);
    else found.push(path);
  }
  return found;
}

/** The file the asset Worker would serve for `path` (html_handling: auto-trailing-slash). */
function servedFile(path: string): string | null {
  for (const candidate of [path, `${path}.html`, join(path, "index.html")]) {
    const file = join(OUT, candidate);
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

function write(path: string, content: string) {
  mkdirSync(dirname(join(OUT, path)), { recursive: true });
  writeFileSync(join(OUT, path), content);
}

async function main() {
  if (!existsSync(join(OUT, "index.html"))) {
    throw new Error(`${OUT} holds no export; run next build first.`);
  }
  const problems: string[] = [];

  const sitemaps = readdirSync(PUBLIC).filter((f) => /^sitemap.*\.xml$/.test(f));
  if (sitemaps.length === 0) problems.push("postbuild wrote no sitemap to public/");
  for (const file of [...POSTBUILD_FILES, ...sitemaps]) {
    if (existsSync(join(PUBLIC, file))) copyFileSync(join(PUBLIC, file), join(OUT, file));
    else problems.push(`postbuild did not write public/${file}`);
  }

  write(ANNOUNCEMENTS_FEED_PATH, announcementsFeed());

  const commit = process.env.COMMIT_SHA;
  if (commit) {
    write("version.json", `${JSON.stringify({ commit, notes: process.env.NOTES_SHA ?? null })}\n`);
  }

  for (const path of DEV_ONLY_PATHS) {
    if (existsSync(join(OUT, path))) problems.push(`dev-only page in the export: /${path}`);
  }

  // Static lines first, then the ones with a placeholder or a splat, each
  // group in its original order. Cloudflare takes the first match, so an
  // exact /newsletter/12 wins over /newsletter/*, as it did in Next.
  const rules = toCloudflareRedirects(await generateRedirects());
  const ordered = [
    ...rules.filter((r) => !isDynamicRedirect(r)),
    ...rules.filter((r) => isDynamicRedirect(r)),
  ];
  const dynamic = ordered.filter(isDynamicRedirect).length;
  if (ordered.length - dynamic > MAX_STATIC_REDIRECTS) problems.push("too many static redirects");
  if (dynamic > MAX_DYNAMIC_REDIRECTS) problems.push("too many dynamic redirects");
  for (const rule of ordered) {
    if (redirectLine(rule).length > 1_000) problems.push(`redirect over 1,000 chars: ${rule[0]}`);
    // Redirects run before files, so one on a real page would hide it.
    if (!isDynamicRedirect(rule) && servedFile(rule[0]))
      problems.push(`redirect shadows a page: ${rule[0]}`);
  }

  const noStore = ["Cache-Control: no-store, max-age=0"];
  const headers: [string, string[]][] = [
    ["/*", SECURITY_HEADERS.map(({ key, value }) => `${key}: ${value}`)],
    ...NOINDEX_HOSTS.map((host): [string, string[]] => [
      `https://${host}/*`,
      ["X-Robots-Tag: noindex, nofollow"],
    ]),
    // Polled by the deploy job; must never come from a cache.
    ["/version.json", noStore],
    // Read by the next deploy's chunk carry (scripts/carry-static.mjs).
    ["/release-assets.json", noStore],
    // Other sites read the announcements feed; it was an API route with
    // these headers. A deploy brings new entries, so the edge may keep it
    // for an hour like before.
    [
      ANNOUNCEMENTS_FEED_PATH,
      [
        "Content-Type: application/rss+xml; charset=utf-8",
        "Access-Control-Allow-Origin: *",
        "Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      ],
    ],
  ];
  if (headers.length > MAX_HEADER_RULES) problems.push("too many _headers rules");

  const files = walk(OUT);
  // +2: _redirects and _headers, written below. Neither is served.
  if (files.length + 2 > MAX_FILES) problems.push(`${files.length + 2} files, over ${MAX_FILES}`);
  for (const file of files) {
    if (statSync(file).size > MAX_FILE_BYTES) problems.push(`over 25 MiB: ${relative(OUT, file)}`);
  }

  if (problems.length > 0) {
    throw new Error(`static export is not deployable:\n  ${problems.join("\n  ")}`);
  }

  writeFileSync(join(OUT, "_redirects"), `${ordered.map(redirectLine).join("\n")}\n`);
  writeFileSync(
    join(OUT, "_headers"),
    `${headers.map(([path, lines]) => [path, ...lines.map((l) => `  ${l}`)].join("\n")).join("\n")}\n`,
  );
  console.log(
    `[static] ${files.length + 2} files in ${relative(process.cwd(), OUT)}/; _redirects: ${
      ordered.length - dynamic
    } static, ${dynamic} dynamic; _headers: ${headers.length} rules${
      commit ? `; version.json ${commit.slice(0, 8)}` : ""
    }`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

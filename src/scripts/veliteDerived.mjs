import { execFile } from "node:child_process";
import { access, lstat, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

/**
 * Everything that has to run after a Velite build: R3F nav links, the search
 * index, backlinks and the HMR stamp. Shared by next.config.mjs (production
 * builds and plain `next dev`) and src/scripts/dev/watchVelite.ts (`pnpm dev`,
 * where Velite runs in its own process so it never blocks the Next server).
 */

// Files the Next server needs before it can render anything.
export const VELITE_OUTPUT_FILES = [
  "sectionDescriptions.json",
  "posts.json",
  "newsletters.json",
  "booknotes.json",
  "pages.json",
  "podcastnotes.json",
  "travelblogs.json",
  "backlinks.json",
  "r3f-links.json",
];

const toTitleCase = (s) =>
  s
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

// Generate R3F navigation links JSON (replaces next-plugin-preval)
export async function generateR3fLinks() {
  const r3fDir = resolve("src/pages/r3f");
  const shaderDir = resolve("src/shaders/standaloneFragmentShaders");
  // Demos that exist as routes but aren't finished yet: keep them reachable by
  // direct URL for local iteration, but out of the nav (and the timeline).
  let hiddenR3fRoutes = new Set();
  try {
    const hidden = JSON.parse(
      await readFile(resolve("src/content/r3f-hidden-routes.json"), "utf-8"),
    );
    hiddenR3fRoutes = new Set(hidden.hidden);
  } catch {}
  const links = {};
  const dirs = (await readdir(r3fDir)).filter((f) => !f.includes(".tsx"));
  for (const dir of dirs) {
    if (dir === "shaders") continue;
    const dirPath = join(r3fDir, dir);
    if ((await lstat(dirPath)).isFile()) continue;
    const files = await readdir(dirPath);
    links[toTitleCase(dir)] = files
      .map((f) => f.replace(".tsx", ""))
      .map((name) => ({ name, url: `/r3f/${dir}/${name}` }))
      .filter(({ url }) => !hiddenR3fRoutes.has(url));
  }
  const shaders = (await readdir(shaderDir))
    .filter((f) => f.endsWith(".frag"))
    .map((f) => f.replace(".frag", ""));
  links["Shader Demos"] = shaders.map((name) => ({ name, url: `/r3f/shaders/${name}` }));

  // NavbarR3F imports this file statically; skip identical rewrites so the
  // bundler has nothing to invalidate.
  const target = resolve(".velite/r3f-links.json");
  const content = JSON.stringify({ links });
  const previous = await readFile(target, "utf-8").catch(() => null);
  if (previous !== content) await writeFile(target, content);
}

const execFileAsync = promisify(execFile);

// Search index and backlinks read the Velite JSON, so they run after it.
// Both are independent of each other and run in parallel.
export async function generateSearchIndexAndBacklinks() {
  const tsx = resolve("node_modules/.bin/tsx");
  await Promise.all(
    ["src/scripts/generateSearchIndex.ts", "src/scripts/generateBacklinks.ts"].map((script) =>
      execFileAsync(tsx, [script]).catch((error) => {
        console.error(`  [velite] ${script} failed:`, error.stderr || error.message);
      }),
    ),
  );
}

// Dev live reload stamp, imported by src/lib/loadVeliteData.ts. It must exist
// before Turbopack first compiles a content page; after that
// src/scripts/dev/watchVeliteHmr.ts rewrites it on every Velite rebuild.
const VELITE_HMR_STAMP = resolve(".velite/hmr/stamp.json");

export async function writeVeliteHmrStamp() {
  await mkdir(dirname(VELITE_HMR_STAMP), { recursive: true });
  await writeFile(VELITE_HMR_STAMP, JSON.stringify({ updatedAt: Date.now() }));
}

export async function veliteHmrStampExists() {
  return access(VELITE_HMR_STAMP).then(
    () => true,
    () => false,
  );
}

export async function veliteOutputExists(files = VELITE_OUTPUT_FILES) {
  try {
    await Promise.all(files.map((file) => access(resolve(".velite", file))));
    return true;
  } catch {
    return false;
  }
}

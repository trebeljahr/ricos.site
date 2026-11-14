/**
 * Velite content watcher for `pnpm dev`.
 *
 * Runs the initial Velite build and its incremental watch in a separate
 * process, so the Next dev server can answer requests from the existing
 * .velite output right away instead of waiting for a full content build.
 * next.config.mjs skips its own Velite build when VELITE_EXTERNAL=1.
 *
 * watchVeliteHmr.ts sees the JSON this writes: it rewrites the HMR stamp and
 * regenerates backlinks and the search index, same as for any content edit.
 */
import { watch } from "node:fs";
import { setPriority } from "node:os";
import { build } from "velite";
import { generateR3fLinks, veliteOutputExists } from "../veliteDerived.mjs";

// With existing output the startup build overlaps with Next compiling the
// first page, so yield the CPU to that page. On a clean checkout Next waits
// for this build instead, so keep full priority.
if (await veliteOutputExists()) {
  try {
    setPriority(10);
  } catch {}
}

// Velite logs and survives a failed rebuild, but a failed first build throws
// before it starts watching, and exiting here makes concurrently stop the
// whole `pnpm dev`. So report the error and try again after the next edit.
async function buildAndWatch(): Promise<void> {
  const begin = performance.now();
  try {
    // "warn", not "error": Velite reports schema issues as a warning, and a
    // file that fails validation is left out of .velite without any other
    // sign. reportSchemaIssues trims that report to the files just saved.
    await build({ watch: true, clean: false, logLevel: "warn" });
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    console.error("  [velite] build failed; fix the file above and save to retry");
    await nextContentEdit();
    return buildAndWatch();
  }
  await generateR3fLinks();
  console.log(
    `  [velite] content built in ${((performance.now() - begin) / 1000).toFixed(1)}s, watching for changes`,
  );
}

// Velite prints every issue in every file after each rebuild, including dozens
// of known stubs and drafts. Only the files saved since the last rebuild are
// news: a new newsletter without a cover, say, is otherwise dropped silently
// and its page 404s. The first build prints a one-line count instead.
const CONTENT_ROOT = "src/content/Notes";
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const savedSinceRebuild = new Set<string>();
let firstReport = true;

watch(CONTENT_ROOT, { recursive: true }, (_event, file) => {
  if (file && /\.mdx?$/.test(file)) savedSinceRebuild.add(`${CONTENT_ROOT}/${file}`);
});

function reportSchemaIssues(report: string) {
  const blocks = report
    .replace(ANSI, "")
    .split(/\n\s*\n/)
    .map((block) => block.trim().split("\n"))
    .filter(([file, ...lines]) => file && lines.some((line) => /^\s*error\b/.test(line)));

  if (firstReport) {
    firstReport = false;
    if (blocks.length > 0) {
      console.warn(
        `  [velite] ${blocks.length} files fail the schema and are left out (stubs and drafts); saving one prints why`,
      );
    }
    return;
  }

  for (const [file, ...lines] of blocks) {
    if (!savedSinceRebuild.has(file)) continue;
    const reasons = lines
      .filter((line) => /^\s*error\b/.test(line))
      .map((line) => line.replace(/^\s*error\s+/, "").replace(/\s{2,}/g, ": "));
    console.warn(`  [velite] ${file} is left out until fixed:\n    ${reasons.join("\n    ")}`);
  }
  savedSinceRebuild.clear();
}

const velitePrefix = "[VELITE]";
const consoleWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  const [prefix, message] = args;
  if (typeof prefix === "string" && prefix.includes(velitePrefix) && typeof message === "string") {
    if (message.startsWith("issues:")) {
      reportSchemaIssues(message.slice("issues:".length));
      return;
    }
  }
  consoleWarn(...args);
};

function nextContentEdit(): Promise<void> {
  return new Promise((resolve) => {
    const watcher = watch("src/content", { recursive: true }, (_event, file) => {
      if (!file || !/\.(mdx?|json|ya?ml)$/.test(file)) return;
      watcher.close();
      // Let the editor finish writing before Velite reads the file.
      setTimeout(resolve, 200);
    });
  });
}

await buildAndWatch();

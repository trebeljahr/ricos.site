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
    await build({ watch: true, clean: false, logLevel: "error" });
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

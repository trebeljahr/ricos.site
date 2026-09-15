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

const begin = performance.now();
await build({ watch: true, clean: false, logLevel: "error" });
await generateR3fLinks();
console.log(
  `  [velite] content built in ${((performance.now() - begin) / 1000).toFixed(1)}s, watching for changes`,
);

/**
 * PostCSS plugin that runs before @tailwindcss/postcss and stops it from
 * reusing a compiler built from an older version of a CSS file.
 *
 * @tailwindcss/postcss (4.2.2) caches one compiler per file in the PostCSS
 * worker and only rebuilds it when the file's mtime changes. It never compares
 * the CSS content it is given. Turbopack passes content it read itself, so the
 * two can disagree for one run: when a git checkout or ff-merge rewrites
 * globals.css together with .tsx files, Turbopack can re-run PostCSS for the
 * .tsx change with the old globals.css content while the file on disk already
 * has the new mtime. Tailwind rebuilds from the old content and stores the new
 * mtime. The run with the new content then sees an unchanged mtime, reuses the
 * old compiler, and the served CSS keeps the old @theme/@utility/@property
 * rules while new utility classes from .tsx files still appear. Turbopack also
 * persists that output in .next/dev, so a dev server restart does not fix it.
 *
 * Reproduced 2026-09-16: alternating `git checkout` of globals.css + .tsx
 * files under a running `next dev` left the CSS stale in 2 of 6 switches.
 *
 * Fix: remember the content hash and mtime of each file per worker. When the
 * content changed but the mtime did not, bump the file's mtime so Tailwind
 * does a full rebuild from the content it was given. The file content is
 * never written.
 */
const { createHash } = require("node:crypto");
const { statSync, utimesSync } = require("node:fs");

function tailwindMtimeGuard() {
  const seen = new Map();

  return {
    postcssPlugin: "tailwind-mtime-guard",
    Once(root, { result }) {
      // Tailwind stats the raw `from` path, so use the same one.
      const from = result.opts.from;
      if (!from || from.includes("node_modules")) return;
      const stat = statSync(from, { throwIfNoEntry: false });
      if (!stat) return;

      const css = root.source?.input.css ?? root.toString();
      const hash = createHash("sha1").update(css).digest("hex");
      let mtimeMs = stat.mtimeMs;
      const previous = seen.get(from);

      if (previous && previous.hash !== hash && previous.mtimeMs === mtimeMs) {
        const now = new Date();
        try {
          utimesSync(from, now, now);
          mtimeMs = statSync(from).mtimeMs;
        } catch {}
      }

      seen.set(from, { hash, mtimeMs });
    },
  };
}

tailwindMtimeGuard.postcss = true;

module.exports = tailwindMtimeGuard;

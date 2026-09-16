/**
 * Clears Turbopack's dev cache (.next/dev) when it was built for a different
 * setup than the one starting now.
 *
 * A stale cache made Next 16.2.1 spawn PostCSS workers in a loop: compiling
 * `/` with a .next/dev left over from before the `turbopack.root` change
 * started ~20 `node .next/dev/build/postcss.js` processes per second (66
 * after 2s, ~2,000 after 80s, ~10 GB), which crashed the machine. The same
 * worktree with a fresh cache stays at 3-4 workers. Agent worktrees keep
 * their .next for days while main moves on, so this hit them repeatedly.
 *
 * The stamp covers what the cache depends on: the Next version, the project
 * root and the build config files. Runs synchronously from next.config.mjs in
 * dev, before Turbopack opens the cache. When next.config changes mid-session
 * Next restarts the server, so clearing at that point is correct too.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const INPUTS = ["next.config.mjs", "postcss.config.cjs", "pnpm-lock.yaml"];

function stampFor(root) {
  const hash = createHash("sha256");
  hash.update(root);
  try {
    hash.update(readFileSync(join(root, "node_modules/next/package.json")));
  } catch {}
  for (const file of INPUTS) {
    try {
      hash.update(file);
      hash.update(readFileSync(join(root, file)));
    } catch {}
  }
  return hash.digest("hex");
}

export function clearStaleDevCache(root) {
  const nextDir = join(root, ".next");
  const devCache = join(nextDir, "dev");
  const stampFile = join(nextDir, "dev-cache-stamp");
  const stamp = stampFor(root);

  let previous = null;
  try {
    previous = readFileSync(stampFile, "utf-8").trim();
  } catch {}
  if (previous === stamp) return;

  if (existsSync(devCache)) {
    console.log("  [dev-cache] Next version or build config changed; clearing stale .next/dev");
    rmSync(devCache, { recursive: true, force: true });
  }
  mkdirSync(nextDir, { recursive: true });
  writeFileSync(stampFile, `${stamp}\n`);
}

// Finds Playwright without making it a dependency of this repo.
// Order: a local install (playwright or @playwright/test), then a one-off
// install from `npx -p playwright` / `pnpm dlx`, whose bin folder is on PATH.
import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { pathToFileURL } from "node:url";

export async function loadChromium() {
  for (const name of ["playwright", "@playwright/test"]) {
    try {
      const mod = await import(name);
      if (mod.chromium) return mod.chromium;
    } catch {
      // not installed here, try the next source
    }
  }
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (!dir.endsWith(join("node_modules", ".bin"))) continue;
    const entry = join(dir, "..", "playwright", "index.mjs");
    if (existsSync(entry)) {
      const mod = await import(pathToFileURL(entry).href);
      if (mod.chromium) return mod.chromium;
    }
  }
  throw new Error(
    "Playwright not found. Run this script with a one-off install:\n" +
      "  npx -y -p playwright@1.64.0 -c 'node <script>'\n" +
      "and install its browser once with: npx -y playwright@1.64.0 install chromium",
  );
}

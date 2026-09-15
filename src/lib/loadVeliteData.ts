// JSON reads stay dynamic so Turbopack does not bundle large Velite outputs.

// Live content reload in dev. `src/scripts/dev/watchVeliteHmr.ts` rewrites
// this tiny stamp after every Velite rebuild. Because the require is static,
// the stamp is part of every content page's server module graph: Turbopack
// re-evaluates the page and sends `serverOnlyChanges`, and the pages router
// refetches getStaticProps in the open tab. A fs read would be invisible to the
// bundler and never trigger that. next.config.mjs writes the stamp before the
// first compile, so it exists whenever Turbopack resolves this.
function trackVeliteHmr() {
  if (process.env.NODE_ENV !== "development") return;
  try {
    require("../../.velite/hmr/stamp.json");
  } catch {
    // Scripts run outside Next may start before the stamp exists.
  }
}

// Next dev caches getStaticPaths per route and serves the cached list while it
// recomputes in the background, so a new or renamed slug 404s on its first
// request. "blocking" makes dev render unknown slugs on demand instead; pages
// using it must return `notFound` for slugs with no content. Production keeps
// `fallback: false`, so builds still prerender exactly the listed paths.
export const veliteFallback: false | "blocking" =
  process.env.NODE_ENV === "development" ? "blocking" : false;

// biome-ignore lint/suspicious/noExplicitAny: callers pass the expected Velite collection type
export function loadVeliteData<T = any>(filename: string): T {
  trackVeliteHmr();
  // biome-ignore lint/security/noGlobalEval: hide require from Turbopack static analysis
  const fs = eval("require")("fs");
  // biome-ignore lint/security/noGlobalEval: hide require from Turbopack static analysis
  const path = eval("require")("path");
  const filePath = path.resolve(process.cwd(), ".velite", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

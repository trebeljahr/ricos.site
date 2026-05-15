// JSON reads stay dynamic so Turbopack does not bundle large Velite outputs.
// The tiny stamp requires below give dev HMR a cheap dependency to invalidate.

function trackVeliteHmr(filename: string) {
  try {
    switch (filename) {
      case "sectionDescriptions.json":
        require("../../.velite/hmr/sectionDescriptions.json");
        break;
      case "posts.json":
        require("../../.velite/hmr/posts.json");
        break;
      case "newsletters.json":
        require("../../.velite/hmr/newsletters.json");
        break;
      case "booknotes.json":
        require("../../.velite/hmr/booknotes.json");
        break;
      case "pages.json":
        require("../../.velite/hmr/pages.json");
        break;
      case "podcastnotes.json":
        require("../../.velite/hmr/podcastnotes.json");
        break;
      case "travelblogs.json":
        require("../../.velite/hmr/travelblogs.json");
        break;
      case "backlinks.json":
        require("../../.velite/hmr/backlinks.json");
        break;
    }
  } catch {
    // Missing stamps should not block scripts or a first clean build.
  }
}

// biome-ignore lint/suspicious/noExplicitAny: callers pass the expected Velite collection type
export function loadVeliteData<T = any>(filename: string): T {
  trackVeliteHmr(filename);
  // biome-ignore lint/security/noGlobalEval: hide require from Turbopack static analysis
  const fs = eval("require")("fs");
  // biome-ignore lint/security/noGlobalEval: hide require from Turbopack static analysis
  const path = eval("require")("path");
  const filePath = path.resolve(process.cwd(), ".velite", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

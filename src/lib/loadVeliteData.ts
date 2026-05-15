// JSON reads stay dynamic so Turbopack does not bundle large Velite outputs.
// Stamp reads are optional; keep them hidden from static analysis so clean dev
// starts do not warn when .velite/hmr has not been created yet.

function trackVeliteHmr(filename: string) {
  try {
    // biome-ignore lint/security/noGlobalEval: hide optional dev stamp reads from Turbopack
    const fs = eval("require")("fs");
    // biome-ignore lint/security/noGlobalEval: hide optional dev stamp reads from Turbopack
    const path = eval("require")("path");
    const stampPath = path.resolve(process.cwd(), ".velite", "hmr", filename);
    if (fs.existsSync(stampPath)) {
      fs.readFileSync(stampPath, "utf-8");
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

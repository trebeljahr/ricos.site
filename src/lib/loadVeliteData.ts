// Dynamic fs/path import hidden from Turbopack's static analysis.
// This function only runs server-side (getStaticProps, getStaticPaths, etc).

export function loadVeliteData<T = any>(filename: string): T {
  // biome-ignore lint/security/noGlobalEval: hide require from Turbopack static analysis
  const fs = eval("require")("fs");
  // biome-ignore lint/security/noGlobalEval: hide require from Turbopack static analysis
  const path = eval("require")("path");
  const filePath = path.resolve(process.cwd(), ".velite", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// Dynamic fs/path import hidden from Turbopack's static analysis.
// This function only runs server-side (getStaticProps, getStaticPaths, etc).

export function loadVeliteData<T = any>(filename: string): T {
  // eslint-disable-next-line no-eval
  const fs = eval("require")("fs");
  // eslint-disable-next-line no-eval
  const path = eval("require")("path");
  const filePath = path.resolve(process.cwd(), ".velite", filename);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

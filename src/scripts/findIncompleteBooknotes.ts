#!/usr/bin/env npx ts-node

import fs from "node:fs";
import path from "node:path";

const NOTES_DIR: string = process.argv[2] ?? "./src/content/Notes/booknotes";
const EXTENSIONS: string[] = [".md", ".mdx"];

function extractFrontmatter(content: string): string | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return match[1];
}

function parseYamlBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
}

function getPublished(frontmatterStr: string): boolean | undefined {
  const match = frontmatterStr.match(/^published\s*:\s*(.+)$/m);
  if (!match) return undefined;
  return parseYamlBool(match[1].trim());
}

function walk(dir: string): string[] {
  let files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walk(full));
    } else if (EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

const absDir = path.resolve(NOTES_DIR);
if (!fs.existsSync(absDir)) {
  console.error(`Directory not found: ${absDir}`);
  process.exit(1);
}

const files = walk(absDir);
const noFrontmatter: string[] = [];
const notPublished: { file: string; reason: string }[] = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  const fm = extractFrontmatter(content);
  const rel = path.relative(absDir, file);

  if (!fm) {
    noFrontmatter.push(rel);
    continue;
  }

  const published = getPublished(fm);
  if (published === undefined || published === false) {
    notPublished.push({
      file: rel,
      reason: published === undefined ? "missing 'published' key" : "published: false",
    });
  }
}

console.log("\n========================================");
console.log(`Scanned ${files.length} file(s) in: ${absDir}`);
console.log("========================================\n");

if (noFrontmatter.length === 0 && notPublished.length === 0) {
  console.log("✅ All notes have frontmatter and are published!");
} else {
  if (noFrontmatter.length > 0) {
    console.log(`🚫 No frontmatter at all (${noFrontmatter.length}):`);
    // biome-ignore lint/complexity/noForEach: callback uses early return / vendored script
    noFrontmatter.forEach((f) => console.log(`   - ${f}`));
    console.log();
  }

  if (notPublished.length > 0) {
    console.log(`📝 Not published (${notPublished.length}):`);
    // biome-ignore lint/complexity/noForEach: callback uses early return / vendored script
    notPublished.forEach(({ file, reason }) => console.log(`   - ${file}  (${reason})`));
    console.log();
  }
}

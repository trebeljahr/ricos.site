import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const NOTES_DIR = resolve("src/content/Notes");
const NOW_FILE = "pages/now.md";
const OUTPUT_DIR = resolve("src/content/now-history");

function extractFrontmatterField(raw: string, field: string): string {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return "";
  // Single-line: description: 'value' or description: "value" or description: value
  const match = fmMatch[1].match(new RegExp(`^${field}:\\s*['"](.+?)['"]\\s*$`, "m"));
  if (match) return match[1];
  const plainMatch = fmMatch[1].match(new RegExp(`^${field}:\\s+([^'">].+)$`, "m"));
  if (plainMatch) return plainMatch[1].trim();
  // Multi-line YAML value (>- or > syntax) — collect all indented continuation lines
  const multiMatch = fmMatch[1].match(new RegExp(`^${field}:\\s*>-?\\s*\\n((?:\\s+.+\\n?)+)`, "m"));
  if (multiMatch) return multiMatch[1].replace(/^\s+/gm, "").trim();
  return "";
}

function stripFrontmatter(raw: string): string {
  return raw.replace(/^---[\s\S]*?---\n*/, "").trim();
}

function fixBrokenJSX(body: string, raw: string): string {
  // Replace <p>{description}</p> or <p>{frontmatter.description}</p> with the actual description
  if (body.includes("{description}") || body.includes("{frontmatter.description}")) {
    const description = extractFrontmatterField(raw, "description");
    if (description) {
      return body
        .replace(/<p>\{frontmatter\.description\}<\/p>/, description)
        .replace(/<p>\{description\}<\/p>/, description);
    }
  }
  return body;
}

function main() {
  let logOutput = "";
  try {
    logOutput = execSync(
      `cd "${NOTES_DIR}" && git log --format="%H|%ai|%s" --follow "${NOW_FILE}" 2>/dev/null`,
      { encoding: "utf-8" },
    ).trim();
  } catch {
    console.error("Failed to read git history");
    process.exit(1);
  }

  const commits = logOutput.split("\n").map((line) => {
    const [hash, date, ...messageParts] = line.split("|");
    return { hash, date: date.trim(), message: messageParts.join("|").trim() };
  });

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const entries: { date: string; content: string }[] = [];
  let prevContent = "";

  for (const commit of commits) {
    let rawContent = "";
    try {
      rawContent = execSync(
        `cd "${NOTES_DIR}" && git show "${commit.hash}:${NOW_FILE}" 2>/dev/null`,
        { encoding: "utf-8" },
      );
    } catch {
      // Try .mdx extension for older commits
      try {
        rawContent = execSync(
          `cd "${NOTES_DIR}" && git show "${commit.hash}:pages/now.mdx" 2>/dev/null`,
          { encoding: "utf-8" },
        );
      } catch {
        continue;
      }
    }

    let body = stripFrontmatter(rawContent);
    if (body.length < 50) continue;

    body = fixBrokenJSX(body, rawContent);

    // Clean up any leftover YAML artifacts (e.g. >- from multi-line description)
    body = body.replace(/^>-?\s*\n/, "").trim();

    if (body === prevContent) continue;
    prevContent = body;

    const dateStr = commit.date.split(" ")[0]; // YYYY-MM-DD
    entries.push({ date: dateStr, content: body });
  }

  // Write files (entries are newest-first from git log, keep that order for filenames)
  for (const entry of entries) {
    const filename = `${entry.date}.md`;
    writeFileSync(resolve(OUTPUT_DIR, filename), entry.content + "\n");
    console.log(`Wrote ${filename}`);
  }

  console.log(`\nExtracted ${entries.length} snapshots to ${OUTPUT_DIR}`);
}

main();

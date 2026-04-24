import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const NOTES_DIR = resolve("src/content/Notes");
const NOW_FILE = "pages/now.md";
const OUTPUT_FILE = resolve(".velite", "now-history.json");

type NowHistoryEntry = {
  date: string;
  commitHash: string;
  commitMessage: string;
  content: string;
};

function main() {
  // Get all commits that touched the now.md file
  const logOutput = execSync(
    `cd "${NOTES_DIR}" && git log --format="%H|%ai|%s" --follow "${NOW_FILE}" 2>/dev/null`,
    { encoding: "utf-8" },
  ).trim();

  if (!logOutput) {
    console.log("No git history found for Now page");
    writeFileSync(OUTPUT_FILE, "[]");
    return;
  }

  const commits = logOutput.split("\n").map((line) => {
    const [hash, date, ...messageParts] = line.split("|");
    return { hash, date: date.trim(), message: messageParts.join("|").trim() };
  });

  const entries: NowHistoryEntry[] = [];

  for (const commit of commits) {
    try {
      // Get the file content at that commit
      const content = execSync(
        `cd "${NOTES_DIR}" && git show "${commit.hash}:${NOW_FILE}" 2>/dev/null`,
        { encoding: "utf-8" },
      );

      // Strip frontmatter
      const stripped = content.replace(/^---[\s\S]*?---\n*/, "").trim();

      // Skip if content is too short or identical to previous
      if (stripped.length < 50) continue;
      if (entries.length > 0 && entries[entries.length - 1].content === stripped) continue;

      entries.push({
        date: commit.date.split(" ")[0], // Just the date part
        commitHash: commit.hash.slice(0, 8),
        commitMessage: commit.message,
        content: stripped,
      });
    } catch {
      // File might not exist at that commit (renamed, etc.)
      continue;
    }
  }

  mkdirSync(resolve(".velite"), { recursive: true });
  writeFileSync(OUTPUT_FILE, JSON.stringify(entries, null, 2));
  console.log(`Now history generated with ${entries.length} entries`);
}

main();

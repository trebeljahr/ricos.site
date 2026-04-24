import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Resolve to main repo's content submodule (not worktree)
const BOOKNOTES_DIR = process.env.BOOKNOTES_DIR || path.resolve("src/content/Notes/booknotes");

async function searchGoodreads(title: string, author: string): Promise<string | null> {
  const query = encodeURIComponent(`${title} ${author}`);
  const url = `https://www.goodreads.com/search?q=${query}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    const html = await res.text();

    // Extract first book link from search results
    const match = html.match(/\/book\/show\/(\d+[^"]*)/);
    if (match) {
      return `https://www.goodreads.com${match[0].split('"')[0]}`;
    }
    return null;
  } catch (err) {
    console.error(`Failed to search for: ${title}`, err);
    return null;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const files = (await readdir(BOOKNOTES_DIR)).filter((f) => f.endsWith(".md"));
  console.log(`Found ${files.length} booknote files`);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const filepath = path.join(BOOKNOTES_DIR, file);
    const content = await readFile(filepath, "utf-8");

    // Skip if already has goodreadsLink
    if (content.includes("goodreadsLink:")) {
      skipped++;
      continue;
    }

    // Extract title and author from frontmatter
    const titleMatch = content.match(/^title:\s*(.+)$/m);
    const authorMatch = content.match(/^bookAuthor:\s*(.+)$/m);

    if (!titleMatch || !authorMatch) {
      console.log(`  SKIP ${file}: missing title or author`);
      skipped++;
      continue;
    }

    const title = titleMatch[1].trim();
    const author = authorMatch[1].trim();

    console.log(`  Searching: "${title}" by ${author}...`);
    const link = await searchGoodreads(title, author);

    if (link) {
      // Insert goodreadsLink after amazonAffiliateLink or after detailedNotes
      let updated: string;
      if (content.includes("amazonAffiliateLink:")) {
        updated = content.replace(/(amazonAffiliateLink:.*\n)/, `$1goodreadsLink: ${link}\n`);
      } else if (content.includes("detailedNotes:")) {
        updated = content.replace(/(detailedNotes:.*\n)/, `$1goodreadsLink: ${link}\n`);
      } else {
        // Insert before the closing ---
        updated = content.replace(/^---\n/m, `---\ngoodreadsLink: ${link}\n`);
      }

      await writeFile(filepath, updated, "utf-8");
      console.log(`  ✓ Added: ${link}`);
      added++;
    } else {
      console.log(`  ✗ Not found for: ${title}`);
      failed++;
    }

    // Be respectful with rate limiting
    await sleep(1500);
  }

  console.log(`\nDone! Added: ${added}, Skipped: ${skipped}, Not found: ${failed}`);
}

main();

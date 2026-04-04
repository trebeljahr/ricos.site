import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { resolve, join, extname, parse } from "path";
import slugify from "@sindresorhus/slugify";

type BacklinkEntry = {
  title: string;
  link: string;
  type: string;
};

type BacklinksMap = Record<string, BacklinkEntry[]>;

const CONTENT_ROOT = resolve("src/content/Notes");

const COLLECTIONS: {
  dir: string;
  type: string;
  linkPrefix: string;
  slugFromFile: (stem: string, parentDir?: string) => string;
  linkFromSlug: (slug: string, parentDir?: string) => string;
}[] = [
  {
    dir: "posts",
    type: "Post",
    linkPrefix: "/posts/",
    slugFromFile: (stem) => slugify(stem),
    linkFromSlug: (slug) => `/posts/${slug}`,
  },
  {
    dir: "booknotes",
    type: "Booknote",
    linkPrefix: "/booknotes/",
    slugFromFile: (stem) => slugify(stem),
    linkFromSlug: (slug) => `/booknotes/${slug}`,
  },
  {
    dir: "newsletters",
    type: "Newsletter",
    linkPrefix: "/newsletters/",
    slugFromFile: (stem) => slugify(stem),
    linkFromSlug: (_slug, _parentDir) => "", // resolved from title below
  },
  {
    dir: "pages",
    type: "Page",
    linkPrefix: "/",
    slugFromFile: (stem) => slugify(stem),
    linkFromSlug: (slug) => `/${slug}`,
  },
  {
    dir: "podcastnotes",
    type: "Podcastnote",
    linkPrefix: "/podcastnotes/",
    slugFromFile: (stem) => slugify(stem),
    linkFromSlug: (slug) => `/podcastnotes/${slug}`,
  },
  {
    dir: "travel",
    type: "Travelblog",
    linkPrefix: "/travel/",
    slugFromFile: (stem) => slugify(stem),
    linkFromSlug: (slug, parentDir) => `/travel/${parentDir}/${slug}`,
  },
];

function extractTitle(content: string): string {
  const match = content.match(/^title:\s*(.+)$/m);
  if (!match) return "";
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

function extractFrontmatter(
  content: string
): Record<string, string> {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return {};
  const result: Record<string, string> = {};
  for (const line of fmMatch[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, "");
      result[key] = val;
    }
  }
  return result;
}

// Match markdown links: [text](/path) — only internal links starting with /
const INTERNAL_LINK_REGEX = /\[(?:[^\]]*)\]\((\/?(?:posts|booknotes|newsletters|podcastnotes|travel|pages)\/[^)\s#]+)(?:#[^)]*)?\)/g;
// Also match root-level page links like [text](/principles)
const ROOT_PAGE_LINK_REGEX = /\[(?:[^\]]*)\]\(\/([a-z][a-z0-9-]+)\)/g;

function collectMdFiles(dir: string): string[] {
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) {
        if (entry === ".obsidian" || entry === "assets" || entry === "_data")
          continue;
        walk(full);
      } else if (extname(entry) === ".md") {
        files.push(full);
      }
    }
  }
  walk(dir);
  return files;
}

function getSourceInfo(
  filePath: string
): { link: string; title: string; type: string } | null {
  const rel = filePath.slice(CONTENT_ROOT.length + 1); // e.g. "posts/my-post.md"
  const content = readFileSync(filePath, "utf-8");
  const fm = extractFrontmatter(content);
  const title = fm.title || parse(filePath).name;
  const published = fm.published;
  if (published === "false") return null;

  for (const col of COLLECTIONS) {
    if (rel.startsWith(col.dir + "/")) {
      const stem = parse(filePath).name;
      const slug = col.slugFromFile(stem);

      // Newsletters use slugified title, not filename
      if (col.dir === "newsletters") {
        const slugTitle = slugify(title);
        return { link: `/newsletters/${slugTitle}`, title, type: col.type };
      }

      // Travel needs parent folder
      if (col.dir === "travel") {
        const parts = rel.split("/");
        // travel/crete/day-1.md → parentFolder = "crete"
        const parentFolder = parts.length >= 3 ? slugify(parts[1]) : "";
        return {
          link: col.linkFromSlug(slug, parentFolder),
          title,
          type: col.type,
        };
      }

      return { link: col.linkFromSlug(slug), title, type: col.type };
    }
  }
  return null;
}

function extractInternalLinks(content: string): string[] {
  const links: string[] = [];

  // Strip frontmatter before scanning
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, "");

  let match: RegExpExecArray | null;

  INTERNAL_LINK_REGEX.lastIndex = 0;
  while ((match = INTERNAL_LINK_REGEX.exec(body)) !== null) {
    let href = match[1];
    // Normalize: ensure leading slash
    if (!href.startsWith("/")) href = "/" + href;
    // Remove trailing slash
    href = href.replace(/\/$/, "");
    links.push(href);
  }

  return [...new Set(links)];
}

function generateBacklinks() {
  const allFiles = collectMdFiles(CONTENT_ROOT);

  // Build source info map: filePath → { link, title, type }
  const sourceMap = new Map<string, { link: string; title: string; type: string }>();
  for (const f of allFiles) {
    const info = getSourceInfo(f);
    if (info) sourceMap.set(f, info);
  }

  // Build forward links: source.link → [target links]
  const forwardLinks = new Map<string, string[]>();
  for (const f of allFiles) {
    const source = sourceMap.get(f);
    if (!source) continue;
    const content = readFileSync(f, "utf-8");
    const targets = extractInternalLinks(content);
    if (targets.length > 0) {
      forwardLinks.set(source.link, targets);
    }
  }

  // Build reverse index: target.link → [source entries]
  const backlinks: BacklinksMap = {};
  for (const [sourceLink, targets] of forwardLinks) {
    const source = [...sourceMap.values()].find((s) => s.link === sourceLink);
    if (!source) continue;

    for (const targetLink of targets) {
      if (!backlinks[targetLink]) backlinks[targetLink] = [];
      // Avoid duplicates
      if (!backlinks[targetLink].some((b) => b.link === source.link)) {
        backlinks[targetLink].push({
          title: source.title,
          link: source.link,
          type: source.type,
        });
      }
    }
  }

  // Sort backlinks alphabetically by title
  for (const key of Object.keys(backlinks)) {
    backlinks[key].sort((a, b) => a.title.localeCompare(b.title));
  }

  writeFileSync(
    resolve(".velite", "backlinks.json"),
    JSON.stringify(backlinks, null, 2)
  );

  const totalBacklinks = Object.values(backlinks).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  const pagesWithBacklinks = Object.keys(backlinks).length;
  console.log(
    `Backlinks generated: ${totalBacklinks} links across ${pagesWithBacklinks} pages`
  );
}

generateBacklinks();

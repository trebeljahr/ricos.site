import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type SearchItem = {
  title: string;
  description: string;
  link: string;
  type: string;
  tags: string;
};

function loadJson(file: string) {
  try {
    return JSON.parse(readFileSync(resolve(".velite", file), "utf-8"));
  } catch {
    return [];
  }
}

function generateSearchIndex() {
  const posts = loadJson("posts.json");
  const newsletters = loadJson("newsletters.json");
  const booknotes = loadJson("booknotes.json");
  const travelblogs = loadJson("travelblogs.json");
  const podcastnotes = loadJson("podcastnotes.json");
  const pages = loadJson("pages.json");

  const items: SearchItem[] = [];

  for (const p of posts) {
    if (!p.published) continue;
    items.push({
      title: p.title,
      description: p.excerpt || p.metaDescription || "",
      link: p.link,
      type: "Post",
      tags: p.tags || "",
    });
  }

  for (const n of newsletters) {
    if (!n.published) continue;
    items.push({
      title: n.title,
      description: n.excerpt || n.metaDescription || "",
      link: n.link,
      type: "Newsletter",
      tags: n.tags || "",
    });
  }

  for (const b of booknotes) {
    if (!b.published || !b.summary) continue;
    items.push({
      title: `${b.title} by ${b.bookAuthor}`,
      description: b.excerpt || b.metaDescription || "",
      link: b.link,
      type: "Book Notes",
      tags: b.tags || "",
    });
  }

  for (const t of travelblogs) {
    if (!t.published) continue;
    items.push({
      title: t.title,
      description: t.excerpt || t.metaDescription || "",
      link: t.link,
      type: "Travel",
      tags: t.tags || "",
    });
  }

  for (const p of podcastnotes) {
    if (!p.published) continue;
    items.push({
      title: p.title,
      description: p.excerpt || p.metaDescription || "",
      link: p.link,
      type: "Podcast",
      tags: p.tags || "",
    });
  }

  for (const p of pages) {
    if (!p.published) continue;
    items.push({
      title: p.title,
      description: p.excerpt || p.metaDescription || "",
      link: p.link,
      type: "Page",
      tags: p.tags || "",
    });
  }

  writeFileSync(resolve("public", "search-index.json"), JSON.stringify(items));

  console.log(`Search index generated with ${items.length} items`);
}

generateSearchIndex();

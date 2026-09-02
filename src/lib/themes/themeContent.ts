// Shared between /categories and /themes/[slug]. Both pages answer the same
// question — which published pieces belong to a theme or a tag — so they read
// it from here rather than each keeping their own copy of the matching rules.

import { byOnlyPublished } from "src/lib/utils/filters";
import { canonicalizeTags, type Theme } from "./themesData";

export type ItemCover = { src: string; alt: string; width: number; height: number } | null;

export type Item = {
  link: string;
  title: string;
  contentType: string;
  date?: string;
  excerpt?: string;
  readingTime?: number;
  cover: ItemCover;
};

export type RawDoc = {
  title: string;
  link: string;
  contentType: string;
  date?: string;
  excerpt?: string;
  tags?: string;
  cover?: { src: string; alt: string; width: number; height: number };
  metadata?: { readingTime?: number };
  draft?: boolean;
  published?: boolean;
};

export function toItem(doc: RawDoc): Item {
  return {
    link: doc.link,
    title: doc.title,
    contentType: doc.contentType,
    date: doc.date,
    excerpt: doc.excerpt,
    readingTime: doc.metadata?.readingTime,
    cover: doc.cover
      ? {
          src: doc.cover.src,
          alt: doc.cover.alt,
          width: doc.cover.width,
          height: doc.cover.height,
        }
      : null,
  };
}

export function byDateDesc(a: Item, b: Item) {
  const ad = a.date ? Date.parse(a.date) : 0;
  const bd = b.date ? Date.parse(b.date) : 0;
  return bd - ad;
}

/** Every published doc across the collections the themes layer draws from. */
export async function loadThemeDocs(): Promise<RawDoc[]> {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const buckets: RawDoc[][] = [
    loadVeliteData("posts.json"),
    loadVeliteData("booknotes.json"),
    loadVeliteData("pages.json"),
    loadVeliteData("newsletters.json"),
    loadVeliteData("travelblogs.json"),
  ];
  return buckets.flat().filter(byOnlyPublished);
}

export function canonicalTagsByDoc(docs: RawDoc[]): Map<RawDoc, string[]> {
  return new Map(docs.map((doc) => [doc, canonicalizeTags(doc.tags)]));
}

/** Docs matching a theme, newest first — by canonical tag, or content type. */
export function itemsForTheme(
  theme: Theme,
  docs: RawDoc[],
  tagsByDoc: Map<RawDoc, string[]>,
): Item[] {
  const tagSet = new Set(theme.tagMembers);
  const fallback = new Set(theme.contentTypeFallback ?? []);
  const seen = new Set<string>();
  const matched: RawDoc[] = [];

  for (const doc of docs) {
    const tags = tagsByDoc.get(doc) ?? [];
    const hit = tags.some((tag) => tagSet.has(tag)) || fallback.has(doc.contentType);
    if (hit && !seen.has(doc.link)) {
      seen.add(doc.link);
      matched.push(doc);
    }
  }

  return matched.map(toItem).sort(byDateDesc);
}

import { getRandom } from "src/lib/math/getRandom";

type ContentWithTags = {
  slug: string;
  tags: string;
  link: string;
  [key: string]: unknown;
};

export function getRelatedContent<T extends ContentWithTags>(
  currentItem: T,
  allItems: T[],
  count: number = 3
): T[] {
  const currentTags = new Set(
    currentItem.tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  );

  if (currentTags.size === 0) {
    return getRandom(
      allItems.filter((item) => item.slug !== currentItem.slug),
      count
    );
  }

  const scored = allItems
    .filter((item) => item.slug !== currentItem.slug)
    .map((item) => {
      const itemTags = new Set(
        item.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      );
      let overlap = 0;
      for (const tag of currentTags) {
        if (itemTags.has(tag)) overlap++;
      }
      return { item, overlap };
    })
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);

  if (scored.length >= count) {
    return scored.slice(0, count).map(({ item }) => item);
  }

  // Fill remaining slots with random non-overlapping items
  const selected = scored.map(({ item }) => item);
  const selectedSlugs = new Set(selected.map((i) => i.slug));
  selectedSlugs.add(currentItem.slug);

  const remaining = allItems.filter((item) => !selectedSlugs.has(item.slug));
  const filler = getRandom(remaining, count - selected.length);

  return [...selected, ...filler];
}

type ContentWithTags = {
  slug: string;
  tags: string;
  link: string;
  [key: string]: unknown;
};

// Deterministic 32-bit hash (djb2-ish). Same slug → same number across
// builds, so related-content picks form a stable link graph.
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function pickStable<T extends ContentWithTags>(currentSlug: string, pool: T[], count: number): T[] {
  return pool
    .map((item) => ({ item, score: hash(currentSlug + "|" + item.slug) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count)
    .map(({ item }) => item);
}

export function getRelatedContent<T extends ContentWithTags>(
  currentItem: T,
  allItems: T[],
  count = 3,
): T[] {
  const currentTags = new Set(
    currentItem.tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean),
  );

  if (currentTags.size === 0) {
    return pickStable(
      currentItem.slug,
      allItems.filter((item) => item.slug !== currentItem.slug),
      count,
    );
  }

  const scored = allItems
    .filter((item) => item.slug !== currentItem.slug)
    .map((item) => {
      const itemTags = new Set(
        item.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      );
      let overlap = 0;
      for (const tag of currentTags) {
        if (itemTags.has(tag)) overlap++;
      }
      return { item, overlap };
    })
    .filter(({ overlap }) => overlap > 0)
    // Tie-break by stable hash so equal-overlap picks don't reshuffle
    // between builds.
    .sort(
      (a, b) =>
        b.overlap - a.overlap ||
        hash(currentItem.slug + "|" + a.item.slug) - hash(currentItem.slug + "|" + b.item.slug),
    );

  if (scored.length >= count) {
    return scored.slice(0, count).map(({ item }) => item);
  }

  const selected = scored.map(({ item }) => item);
  const selectedSlugs = new Set(selected.map((i) => i.slug));
  selectedSlugs.add(currentItem.slug);

  const remaining = allItems.filter((item) => !selectedSlugs.has(item.slug));
  const filler = pickStable(currentItem.slug, remaining, count - selected.length);

  return [...selected, ...filler];
}

import type { CommonMetadata } from "src/@types";
import seoMetadata from "src/content/seo-metadata.json";
import type { TimelineEntry } from "./timeline";
import { sortTimelineEntries } from "./timeline";
import { turnKebabIntoTitleCase } from "./utils/turnKebapIntoTitleCase";

type SeoEntry = {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
};

const seoByPath = seoMetadata as Record<string, SeoEntry | undefined>;
const seoByLowerPath = Object.fromEntries(
  Object.entries(seoByPath).map(([path, entry]) => [path.toLowerCase(), entry]),
) as Record<string, SeoEntry | undefined>;

const r3fCreatedAtByPath: Record<string, string> = {
  "/r3f/controllers/bruno-simon-controller": "2025-03-25",
  "/r3f/controllers/ecctrl-controller": "2025-03-25",
  "/r3f/controllers/first-person-controller": "2025-03-25",
  "/r3f/controllers/third-person-controller": "2025-03-25",
  "/r3f/dungeon/dungeon-3d": "2025-03-25",
  "/r3f/dungeon/dungeon-algo-3d": "2025-03-25",
  "/r3f/experiments/gaming-testbed": "2025-03-25",
  "/r3f/experiments/instanced-mesh-2": "2025-03-25",
  "/r3f/experiments/lightning-spell": "2025-03-25",
  "/r3f/experiments/lightning-strike": "2025-03-25",
  "/r3f/experiments/navmesh": "2025-03-25",
  "/r3f/experiments/navmesh-3rd-person": "2025-03-27",
  "/r3f/experiments/navmesh-rigid-body-agent": "2025-03-26",
  "/r3f/experiments/textures": "2025-03-25",
  "/r3f/experiments/yuka-ai-implementation": "2025-03-25",
  "/r3f/grass/al-ro-grass": "2025-03-25",
  "/r3f/grass/james-smyth-grass": "2025-03-25",
  "/r3f/models/cat": "2025-03-25",
  "/r3f/models/fbx-viewer": "2025-03-25",
  "/r3f/models/mixamo-characters": "2025-03-25",
  "/r3f/models/quaternius-models": "2025-03-25",
  "/r3f/models/ship": "2025-03-25",
  "/r3f/particles/birds": "2025-03-25",
  "/r3f/particles/fbo-demo": "2025-03-25",
  "/r3f/particles/fishes": "2025-03-25",
  "/r3f/particles/mesh-merger": "2025-03-27",
  "/r3f/scenes/grass-experiments": "2026-01-19",
  "/r3f/scenes/heightfield": "2025-03-25",
  "/r3f/scenes/ocean": "2025-03-25",
  "/r3f/scenes/plasma-ball": "2025-03-25",
  "/r3f/scenes/shader-art-demo": "2025-03-25",
  "/r3f/scenes/shader-editor": "2025-03-25",
  "/r3f/scenes/snow-forest": "2025-03-25",
  "/r3f/scenes/terrain": "2025-03-25",
  "/r3f/scenes/underwater-shader": "2026-04-02",
  "/r3f/user-interfaces/healthbars": "2025-03-25",
  "/r3f/user-interfaces/inventory": "2025-03-25",
};

const pageExcludeList = new Set(["privacy", "imprint", "support"]);

function getSeoEntry(path: string) {
  return seoByPath[path] || seoByLowerPath[path.toLowerCase()];
}

function titleFromPath(path: string) {
  const lastPart = path.split("/").filter(Boolean).at(-1) || path;
  return turnKebabIntoTitleCase(lastPart);
}

export function getR3fTimelineEntries(): TimelineEntry[] {
  return Object.entries(r3fCreatedAtByPath).map(([href, date]) => {
    const seo = getSeoEntry(href);
    return {
      id: `r3f:${href}`,
      href,
      type: "r3f",
      typeLabel: "R3F demo",
      title: seo?.metaTitle || titleFromPath(href),
      excerpt: seo?.metaDescription,
      date,
      datePrecision: "day",
    };
  });
}

export function getPageTimelineEntries(pages: CommonMetadata[]): TimelineEntry[] {
  return pages
    .filter((page) => page.published && !pageExcludeList.has(page.slug))
    .map((page) => ({
      id: `page:${page.link || page.slug}`,
      href: page.link,
      type: "page",
      typeLabel: "Page",
      title: page.title,
      excerpt: page.excerpt || page.metaDescription,
      date: page.date,
      datePrecision: "day",
      readingTime: page.metadata?.readingTime,
      wordCount: page.metadata?.wordCount,
    }));
}

export function getPhotographyTimelineDate(tripName: string, travelblogs: CommonMetadata[]) {
  const matchingTravel = sortTimelineEntries(
    travelblogs
      .filter((story) => story.parentFolder === tripName && story.date)
      .map((story) => ({
        id: story.link,
        href: story.link,
        title: story.title,
        type: "travel",
        typeLabel: "Travel story",
        date: story.date,
      })),
  )[0];

  if (matchingTravel?.date) {
    return { date: matchingTravel.date, datePrecision: "day" as const };
  }

  const year = tripName.match(/(?:^|-)((?:19|20)\d{2})(?:-|$)/)?.[1];
  if (year) {
    return { date: `${year}-01-01`, datePrecision: "year" as const };
  }

  return { date: undefined, datePrecision: undefined };
}

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

const photographyTimelineDates: Record<
  string,
  Pick<TimelineEntry, "date" | "datePrecision" | "dateLabel">
> = {
  "best-of": { date: "2024-12-30", datePrecision: "day" },
  alps: { date: "2020-08-01", datePrecision: "month" },
  crete: { date: "2021-06-01", datePrecision: "month" },
  "east-india": { date: "2022-01-01", datePrecision: "month" },
  germany: { date: "2023-01-01", datePrecision: "year" },
  indonesia: { date: "2018-05-01", datePrecision: "month" },
  laos: { date: "2018-07-01", datePrecision: "month" },
  rajasthan: { date: "2019-03-01", datePrecision: "month" },
  "sri-lanka": { date: "2018-01-01", datePrecision: "month" },
  thailand: { date: "2018-06-15", datePrecision: "month" },
  vietnam: { date: "2018-06-01", datePrecision: "month" },
  "central-india": { date: "2018-09-01", datePrecision: "month" },
  dominica: { date: "2024-04-10", datePrecision: "month" },
  egypt: { date: "2016-01-01", datePrecision: "year", dateLabel: "2016?" },
  "himachal-pradesh": { date: "2021-01-01", datePrecision: "year" },
  italy: { date: "2012-01-01", datePrecision: "year", dateLabel: "2012?" },
  nepal: { date: "2018-03-15", datePrecision: "month", dateLabel: "Mar-Apr 2018" },
  "south-india": { date: "2018-02-01", datePrecision: "month" },
  varanasi: { date: "2018-09-15", datePrecision: "month" },
  guadeloupe: { date: "2024-03-01", datePrecision: "month" },
  transat: { date: "2024-01-15", datePrecision: "month", dateLabel: "Jan-Feb 2024" },
  martinique: { date: "2024-04-25", datePrecision: "month", dateLabel: "Late Apr 2024" },
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
  const curatedDate = photographyTimelineDates[tripName];
  if (curatedDate) return curatedDate;

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

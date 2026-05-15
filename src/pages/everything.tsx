import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import { TimelineList } from "@components/TimelineList";
import type { CommonMetadata } from "src/@types";
import {
  getPageTimelineEntries,
  getPhotographyTimelineDate,
  getR3fTimelineEntries,
} from "src/lib/everythingTimeline";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import {
  summarizeTimelineEntries,
  type TimelineEntry,
  toSerializableTimelineEntries,
  toTimelineEntries,
} from "src/lib/timeline";
import { byOnlyPublished } from "src/lib/utils/filters";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

type Props = {
  entries: TimelineEntry[];
  totalPieces: number;
  datedPieces: number;
  missingDateCount: number;
  seo: SeoInfo | null;
};

function getPhotographyEntries(
  trips: { name: string }[],
  travelblogs: CommonMetadata[],
): TimelineEntry[] {
  return trips.map(({ name }) => {
    const dateInfo = getPhotographyTimelineDate(name, travelblogs);
    return {
      id: `photography:${name}`,
      href: `/photography/${name}`,
      type: "photography",
      typeLabel: "Photo set",
      title: turnKebabIntoTitleCase(name),
      excerpt: dateInfo.date
        ? "Photography collection."
        : "Photography collection. Needs an exact date for the timeline.",
      ...(dateInfo.date ? { date: dateInfo.date } : {}),
      ...(dateInfo.datePrecision ? { datePrecision: dateInfo.datePrecision } : {}),
    };
  });
}

export default function Everything({
  entries,
  totalPieces,
  datedPieces,
  missingDateCount,
  seo,
}: Props) {
  const url = "everything";

  return (
    <Layout
      title={seo?.metaTitle || "Everything"}
      description={
        seo?.metaDescription ||
        "Everything published on ricos.site in one chronological stream: writing, notes, travel, photography, and R3F demos."
      }
      image={seo?.ogImage || "/assets/blog/network.jpg"}
      imageAlt={seo?.ogImageAlt || "a network of connected dots"}
      keywords={seo?.keywords || ["everything", "timeline", "writing", "photography", "r3f"]}
      url={url}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />

        <section className="mb-14">
          <Header
            title="Everything"
            subtitle={`${totalPieces} things total, ${datedPieces} placed in time, ${missingDateCount} need dates`}
          />
          <p className="max-w-prose text-gray-600 dark:text-gray-300">
            Whole-site stream: writing, notes, pages, photography, and demos. Items without a real
            timestamp sit at the bottom until they get one.
          </p>
        </section>

        <TimelineList entries={entries} initialCount={24} batchSize={16} />
      </main>
    </Layout>
  );
}

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const { trips } = await import("src/pages/photography");
  const posts: CommonMetadata[] = loadVeliteData("posts.json");
  const newsletters: CommonMetadata[] = loadVeliteData("newsletters.json");
  const travelblogs: CommonMetadata[] = loadVeliteData("travelblogs.json");
  const booknotes: CommonMetadata[] = loadVeliteData("booknotes.json");
  const podcastnotes: CommonMetadata[] = loadVeliteData("podcastnotes.json");
  const pages: CommonMetadata[] = loadVeliteData("pages.json");

  const writingEntries = [
    ...toTimelineEntries(posts.filter(byOnlyPublished), "Post"),
    ...toTimelineEntries(newsletters.filter(byOnlyPublished), "Newsletter"),
    ...toTimelineEntries(travelblogs.filter(byOnlyPublished), "Travelblog"),
    ...toTimelineEntries(
      booknotes.filter((booknote) => byOnlyPublished(booknote) && booknote.summary),
      "Booknote",
    ),
    ...toTimelineEntries(podcastnotes.filter(byOnlyPublished), "Podcastnote"),
  ];
  const entries = [
    ...writingEntries,
    ...getPageTimelineEntries(pages),
    ...getPhotographyEntries(trips, travelblogs.filter(byOnlyPublished)),
    ...getR3fTimelineEntries(),
  ];
  const stats = summarizeTimelineEntries(entries);
  const missingDateCount = entries.filter((entry) => !entry.date).length;

  return {
    props: {
      entries: toSerializableTimelineEntries(entries),
      totalPieces: stats.count,
      datedPieces: stats.count - missingDateCount,
      missingDateCount,
      seo: getSeoInfo("/everything"),
    },
  };
};

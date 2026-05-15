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
  type TimelineEntry,
  toSerializableTimelineEntries,
  toTimelineEntries,
} from "src/lib/timeline";
import { byOnlyPublished } from "src/lib/utils/filters";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

type Props = {
  entries: TimelineEntry[];
  seo: SeoInfo | null;
};

type TripImage = { src: string; width: number; height: number; alt?: string };

function getPhotographyEntries(
  trips: { tripName: string; image: TripImage; description?: string }[],
  travelblogs: CommonMetadata[],
): TimelineEntry[] {
  return trips.map(({ tripName, image, description }) => {
    const dateInfo = getPhotographyTimelineDate(tripName, travelblogs);
    const title = turnKebabIntoTitleCase(tripName);
    return {
      id: `photography:${tripName}`,
      href: `/photography/${tripName}`,
      type: "photography",
      typeLabel: "Photo set",
      title,
      ...(description ? { excerpt: description } : {}),
      cover: image?.src
        ? {
            src: image.src,
            alt: image.alt || `A photo from ${title}`,
            width: image.width,
            height: image.height,
          }
        : undefined,
      ...(dateInfo.date ? { date: dateInfo.date } : {}),
      ...(dateInfo.datePrecision ? { datePrecision: dateInfo.datePrecision } : {}),
    };
  });
}

export default function Everything({ entries, seo }: Props) {
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
      <main className="py-20 px-3 max-w-(--breakpoint-lg) mx-auto">
        <BreadCrumbs path={url} />

        <section className="mb-14">
          <Header title="Everything" />
        </section>

        <TimelineList entries={entries} initialCount={24} batchSize={16} />
      </main>
    </Layout>
  );
}

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const { trips } = await import("src/pages/photography");
  const { getImgWidthAndHeightDuringBuild } = await import(
    "src/lib/getImgWidthAndHeightDuringBuild"
  );
  const { getFirstImageFromMetadata, photographyFolder } = await import("src/lib/imageMetadata");

  const posts: CommonMetadata[] = loadVeliteData("posts.json");
  const newsletters: CommonMetadata[] = loadVeliteData("newsletters.json");
  const travelblogs: CommonMetadata[] = loadVeliteData("travelblogs.json");
  const booknotes: CommonMetadata[] = loadVeliteData("booknotes.json");
  const podcastnotes: CommonMetadata[] = loadVeliteData("podcastnotes.json");
  const pages: CommonMetadata[] = loadVeliteData("pages.json");

  const tripsMeta = await Promise.all(
    trips.map(async ({ name, src, alt, description }) => {
      if (src === "") {
        const image = getFirstImageFromMetadata(photographyFolder + name);
        return { image, tripName: name, description };
      }
      const { width, height } = await getImgWidthAndHeightDuringBuild(src);
      return { image: { width, height, src, alt }, tripName: name, description };
    }),
  );

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
    ...getPhotographyEntries(tripsMeta, travelblogs.filter(byOnlyPublished)),
    ...getR3fTimelineEntries(),
  ];

  return {
    props: {
      entries: toSerializableTimelineEntries(entries),
      seo: getSeoInfo("/everything"),
    },
  };
};

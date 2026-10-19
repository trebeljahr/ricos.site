import { DinoTail } from "@components/EasterEggs/Dino";
import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import { TimelineList } from "@components/TimelineList";
import { useRef } from "react";
import type { CommonMetadata } from "src/@types";
import {
  getPageTimelineEntries,
  getPhotographyTimelineDate,
  getProjectTimelineEntries,
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
  trips: { tripName: string; folders: string[]; image: TripImage; description?: string }[],
  travelblogs: CommonMetadata[],
): TimelineEntry[] {
  return trips.map(({ tripName, folders, image, description }) => {
    const dateInfo = getPhotographyTimelineDate(tripName, travelblogs, folders);
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

export default function Timeline({ entries, seo }: Props) {
  const url = "timeline";
  const titleRef = useRef<HTMLElement>(null);

  return (
    <Layout
      title={seo?.metaTitle || "Timeline"}
      description={
        seo?.metaDescription ||
        "Everything published on ricos.site in one chronological stream: writing, notes, travel, photography, projects, and R3F demos."
      }
      image={seo?.ogImage || "/assets/blog/network.jpg"}
      imageAlt={seo?.ogImageAlt || "a network of connected dots"}
      keywords={seo?.keywords || ["timeline", "writing", "photography", "projects", "r3f"]}
      url={url}
    >
      <PageMain>
        <section ref={titleRef} className="mb-section">
          <Header breadcrumbs={{ path: url }} title="Timeline" />
        </section>
        <DinoTail anchorRef={titleRef} />

        <TimelineList entries={entries} initialCount={24} batchSize={16} />
      </PageMain>
    </Layout>
  );
}

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const { trips } = await import("src/pages/photography");
  const { getImgWidthAndHeightDuringBuild } = await import(
    "src/lib/getImgWidthAndHeightDuringBuild"
  );
  const { getFirstPhotographyImage, getPhotographyFolders, getPhotographyTripNames } = await import(
    "src/lib/imageMetadata"
  );

  const posts: CommonMetadata[] = loadVeliteData("posts.json");
  const newsletters: CommonMetadata[] = loadVeliteData("newsletters.json");
  const travelblogs: CommonMetadata[] = loadVeliteData("travelblogs.json");
  const booknotes: CommonMetadata[] = loadVeliteData("booknotes.json");
  const pages: CommonMetadata[] = loadVeliteData("pages.json");

  // Same rule as the /photography index: a curated trip whose folder is not in
  // the metadata (yet) is skipped instead of throwing in getFirstPhotographyImage.
  const galleryNames = getPhotographyTripNames();
  const tripsMeta = await Promise.all(
    trips
      .filter(({ name }) => galleryNames.includes(name))
      .map(async ({ name, src, alt, description }) => {
        const folders = getPhotographyFolders(name);
        if (src === "") {
          const image = getFirstPhotographyImage(name);
          return { image, tripName: name, folders, description };
        }
        const { width, height } = await getImgWidthAndHeightDuringBuild(src);
        return { image: { width, height, src, alt }, tripName: name, folders, description };
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
  ];
  const entries = [
    ...writingEntries,
    ...getPageTimelineEntries(pages),
    ...getPhotographyEntries(tripsMeta, travelblogs.filter(byOnlyPublished)),
    ...getProjectTimelineEntries(),
    ...getR3fTimelineEntries(),
  ];

  return {
    props: {
      entries: toSerializableTimelineEntries(entries),
      seo: getSeoInfo("/timeline"),
    },
  };
};

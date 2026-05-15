import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import { TimelineList } from "@components/TimelineList";
import type { CommonMetadata } from "src/@types";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import {
  summarizeTimelineEntries,
  type TimelineEntry,
  toSerializableTimelineEntries,
  toTimelineEntries,
} from "src/lib/timeline";
import { byOnlyPublished } from "src/lib/utils/filters";

type Props = {
  entries: TimelineEntry[];
  totalWords: number;
  totalPieces: number;
  seo: SeoInfo | null;
};

export default function Writing({ entries, totalWords, totalPieces, seo }: Props) {
  const url = "writing";

  return (
    <Layout
      title={seo?.metaTitle || "Writing"}
      description={
        seo?.metaDescription ||
        "A chronological stream of essays, newsletters, travel stories, book notes, and podcast notes by Rico Trebeljahr."
      }
      image={
        seo?.ogImage || "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg"
      }
      imageAlt={seo?.ogImageAlt || "a hand writing down thoughts on a piece of paper"}
      keywords={seo?.keywords || ["writing", "essays", "newsletter", "travel writing", "notes"]}
      url={url}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />

        <section className="mb-14">
          <Header
            title="Writing"
            subtitle={`${totalPieces} things, ${new Intl.NumberFormat("en").format(totalWords)} words, newest first`}
          />
          <p className="max-w-prose text-gray-600 dark:text-gray-300">
            Essays, newsletters, travel stories, booknotes, and podcast notes in one stream. The
            shelves still exist; this is the river.
          </p>
        </section>

        <TimelineList entries={entries} />
      </main>
    </Layout>
  );
}

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const posts: CommonMetadata[] = loadVeliteData("posts.json");
  const newsletters: CommonMetadata[] = loadVeliteData("newsletters.json");
  const travelblogs: CommonMetadata[] = loadVeliteData("travelblogs.json");
  const booknotes: CommonMetadata[] = loadVeliteData("booknotes.json");
  const podcastnotes: CommonMetadata[] = loadVeliteData("podcastnotes.json");

  const entries = [
    ...toTimelineEntries(posts.filter(byOnlyPublished), "Post"),
    ...toTimelineEntries(newsletters.filter(byOnlyPublished), "Newsletter"),
    ...toTimelineEntries(travelblogs.filter(byOnlyPublished), "Travelblog"),
    ...toTimelineEntries(
      booknotes.filter((booknote) => byOnlyPublished(booknote) && booknote.summary),
      "Booknote",
    ),
    ...toTimelineEntries(podcastnotes.filter(byOnlyPublished), "Podcastnote"),
  ];
  const stats = summarizeTimelineEntries(entries);

  return {
    props: {
      entries: toSerializableTimelineEntries(entries),
      totalPieces: stats.count,
      totalWords: stats.wordCount,
      seo: getSeoInfo("/writing"),
    },
  };
};

import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { HorizontalCard } from "@components/NiceCards";
import Header from "@components/PostHeader";
import { nanoid } from "nanoid";
import { CommonMetadata } from "src/@types";
import { getSeoInfo, SeoInfo } from "src/lib/getSeoInfo";
import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";
import { travelingStoriesMetaRaw, travelingStoryNames } from "..";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

type Props = {
  posts: CommonMetadata[];
  tripName: string;
  seo: SeoInfo | null;
};

const Traveling = ({ posts, tripName, seo }: Props) => {
  const url = "/travel/" + tripName;

  const { title, subtitle, cover } =
    travelingStoriesMetaRaw[tripName] || {};
  const defaultCover = {
    src: "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg",
    alt: "a hand writing down thoughts on a piece of paper",
  };
  const defaultSubtitle = "Traveling Stories from Another Place";
  const defaultDescription = `An overview page for the stories of ${tripName}.`;

  return (
    <Layout
      title={seo?.metaTitle || title || tripName}
      description={seo?.metaDescription || defaultDescription}
      image={seo?.ogImage || cover?.src || defaultCover.src}
      imageAlt={seo?.ogImageAlt || cover?.alt || defaultCover.alt}
      url={url}
      keywords={seo?.keywords || [
        "travel",
        "blog",
        "adventure",
        "stories",
        "traveling",
        "travel stories",
        tripName,
      ]}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />
        <section>
          <Header
            title={turnKebabIntoTitleCase(tripName)}
            subtitle={subtitle || defaultSubtitle}
          />
          {posts.map((post, index) => {
            const priority = index <= 1;

            return (
              <HorizontalCard
                key={nanoid()}
                priority={priority}
                readingTime={post.metadata.readingTime}
                {...post}
              />
            );
          })}
        </section>
      </main>
    </Layout>
  );
};

export default Traveling;

type Params = {
  params: { tripName: string };
};

export const getStaticPaths = async () => {
  return {
    paths: travelingStoryNames.map<Params>((post) => ({
      params: { tripName: post },
    })),
    fallback: false,
  };
};

export const getStaticProps = async ({
  params,
}: Params): Promise<{ props: Props }> => {
  const travelblogs = require("../../../../.velite/travelblogs.json");
  const posts = extractAndSortMetadata(travelblogs)
    .filter(
      ({ parentFolder }: any) => !params.tripName || parentFolder === params.tripName
    )
    .reverse();

  return {
    props: { posts, tripName: params.tripName, seo: getSeoInfo(`/travel/${params.tripName}`) },
  };
};

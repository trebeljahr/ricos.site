import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { HorizontalCard } from "@components/NiceCards";
import Header from "@components/PostHeader";
import { travelblogs } from "@velite";
import { nanoid } from "nanoid";
import {
  CommonMetadata,
  extractAndSortMetadata,
  turnKebabIntoTitleCase,
} from "src/lib/utils";
import { travelingStoriesMeta, travelingStoryNames } from "..";

type Props = {
  posts: CommonMetadata[];
  tripName: string;
};

const Traveling = ({ posts, tripName }: Props) => {
  const url = "/travel/" + tripName;

  const { title, excerpt, cover, subtitle } =
    travelingStoriesMeta[tripName] || {};
  const defaultDescription = `An overview page for the stories of ${tripName}.`;
  const defaultCover = {
    src: "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg",
    alt: "a hand writing down thoughts on a piece of paper",
  };
  const defaultSubtitle = "Traveling Stories from Another Place";

  return (
    <Layout
      title={title || tripName}
      description={excerpt || defaultDescription}
      image={cover?.src || defaultCover.src}
      imageAlt={cover?.alt || defaultCover.alt}
      url={url}
      keywords={[
        "travel",
        "blog",
        "adventure",
        "stories",
        "traveling",
        "travel stories",
        tripName,
      ]}
    >
      <main className="mb-20 px-3">
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
  const posts = extractAndSortMetadata(travelblogs)
    .filter(
      ({ parentFolder }) => !params.tripName || parentFolder === params.tripName
    )
    .reverse();

  return {
    props: { posts, tripName: params.tripName },
  };
};

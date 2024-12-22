import { BreadCrumbs, turnKebabIntoTitleCase } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NiceCard } from "@components/NiceCard";
import Header from "@components/PostHeader";
import { travelblogs, type Travelblog } from "@velite";
import { sortAndFilterNotes as sortAndFilterTravelBlogs } from "src/lib/utils";
import { travelingStoriesMeta, travelingStoryNames } from "..";
import { nanoid } from "nanoid";

type Props = {
  posts: Travelblog[];
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
              <NiceCard
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

export const getStaticProps = async ({ params }: Params) => {
  const posts = sortAndFilterTravelBlogs(travelblogs, params.tripName).map(
    ({ link, title, excerpt, date, cover, metadata }) => {
      return {
        title,
        cover,
        date,
        excerpt,
        metadata,
        link,
      };
    }
  );

  return {
    props: { posts, tripName: params.tripName },
  };
};

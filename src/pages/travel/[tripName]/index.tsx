import { BreadCrumbs, turnKebabIntoTitleCase } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NiceCard } from "@components/NiceCard";
import Header from "@components/PostHeader";
import { travelblogs, type Travelblog } from "@velite";
import slugify from "@sindresorhus/slugify";
import { sortAndFilterNotes as sortAndFilterTravelBlogs } from "src/lib/utils";
import { travelingStoryNames } from "..";
type Props = {
  posts: Travelblog[];
  tripName: string;
};

const Traveling = ({ posts, tripName }: Props) => {
  const url = "/travel/" + tripName;

  return (
    <Layout
      title={`${tripName}`}
      description={`An overview page for the stories of ${tripName}.`}
      image={
        "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg"
      }
      url="posts"
      imageAlt={"a hand writing down thoughts on a piece of paper"}
    >
      <main>
        <BreadCrumbs path={url} />
        <section>
          <Header
            title={turnKebabIntoTitleCase(tripName)}
            subtitle="Traveling Stories from Another Place"
          />
          {posts.map((post, index) => {
            const priority = index <= 1;
            return <NiceCard key={post.slug} priority={priority} {...post} />;
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
    ({ link, title, excerpt, date, cover }) => {
      return {
        title,
        cover,
        date,
        excerpt,
        link,
      };
    }
  );

  return {
    props: { posts, tripName: params.tripName },
  };
};

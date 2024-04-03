import Layout from "@components/layout";
import { HeroPostPreview, OtherPostsPreview } from "@components/post-preview";
import { allNotes, Post, type Note } from "@contentlayer/generated";
import slugify from "@sindresorhus/slugify";
import { travelingStoryNames } from "..";
import { BreadCrumbs } from "@components/BreadCrumbs";
import { parseDate } from "@components/date-formatter";

type Props = {
  posts: Note[];
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
      <article className="posts-overview">
        <section className="main-section">
          <BreadCrumbs path={url} />
        </section>
        <section className="main-section">
          <OtherPostsPreview posts={posts} morePostsText={null} />
        </section>
      </article>
    </Layout>
  );
};

export default Traveling;

export const getStaticPaths = async () => {
  return {
    paths: travelingStoryNames.map((post) => ({ params: { tripName: post } })),
    fallback: false,
  };
};

export const getStaticProps = async ({
  params,
}: {
  params: { tripName: string };
}) => {
  const posts = allNotes
    .filter(({ published }) => published)
    .filter(({ parentFolder }) => params.tripName === parentFolder)
    .map(({ path, title, slug, excerpt, date, cover }) => {
      return {
        title,
        cover,
        date,
        excerpt,
        slug: slugify(path.split("/").at(-2) || "") + "/" + slug,
      };
    })
    .sort((a, b) => {
      return parseDate(a.date) > parseDate(b.date) ? 1 : -1;
    });

  return {
    props: { posts, tripName: params.tripName },
  };
};

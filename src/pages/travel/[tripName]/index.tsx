import Layout from "@components/layout";
import { HeroPostPreview, OtherPostsPreview } from "@components/post-preview";
import { allNotes, Post, type Note } from "@contentlayer/generated";
import slugify from "@sindresorhus/slugify";
import { travelingStoryNames } from "..";
import { BreadCrumbs } from "@components/BreadCrumbs";

type Props = {
  posts: Note[];
  tripName: string;
};

const Notes = ({ posts, tripName }: Props) => {
  const heroPost = posts[0];
  const morePosts = posts.slice(1);

  const url = "/travel/" + tripName;
  return (
    <Layout
      title="Notes - as of yet unstructured writing"
      description="An overview page about the notes on trebeljahr.com"
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
          {heroPost && <HeroPostPreview post={heroPost} />}
          {morePosts.length > 0 && <OtherPostsPreview posts={morePosts} />}
        </section>
      </article>
    </Layout>
  );
};

export default Notes;

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
    .map((note) => {
      return {
        ...note,
        slug: slugify(note.path.split("/").at(-2) || "") + "/" + note.slug,
      };
    });

  console.log(posts.map(({ slug }) => slug));

  return {
    props: { posts, tripName: params.tripName },
  };
};

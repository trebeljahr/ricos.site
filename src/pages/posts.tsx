import Layout from "../components/layout";
import { getAllPosts } from "../lib/api";
import { HeroPostPreview, OtherPostsPreview } from "../components/post-preview";
import { Post } from "contentlayer/generated";

type Props = {
  posts: Post[];
};

const Posts = ({ posts }: Props) => {
  const heroPost = posts[0];
  const morePosts = posts.slice(1);
  return (
    <Layout
      title="Posts - writings of a curious person, about life, the universe and everything"
      description="An overview page about all the posts that I have written so far on trebeljahr.com, ordered by the date that they were published."
    >
      <article className="posts-overview">
        <section className="main-section">
          {heroPost && <HeroPostPreview post={heroPost} />}
          {morePosts.length > 0 && <OtherPostsPreview posts={morePosts} />}
        </section>
      </article>
    </Layout>
  );
};

export default Posts;

export const getStaticProps = async () => {
  const posts = await getAllPosts([
    "title",
    "date",
    "slug",
    "author",
    "cover",
    "excerpt",
  ]);
  return {
    props: { posts },
  };
};

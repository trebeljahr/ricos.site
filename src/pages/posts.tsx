import Layout from "../components/layout";
import { getAllPosts } from "../lib/api";
import { Post } from "../@types/post";
import { HeroPostPreview, OtherPostsPreview } from "../components/post-preview";

type Props = {
  posts: Post[];
};

const Posts = ({ posts }: Props) => {
  const heroPost = posts[0];
  const morePosts = posts.slice(1);
  return (
    <Layout pageTitle="Posts">
      <article>
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
  const posts = getAllPosts([
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

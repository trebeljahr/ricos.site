import Layout from "@components/Layout";
import { OtherPostsPreview } from "@components/PostPreview";
import { Post, allPosts } from "@contentlayer/generated";

type Props = {
  posts: Post[];
};

const Posts = ({ posts }: Props) => {
  return (
    <Layout
      title="Posts - writings of a curious person, about life, the universe and everything"
      description="An overview page about all the posts that I have written so far on trebeljahr.com, ordered by the date that they were published."
      image={
        "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg"
      }
      url="posts"
      imageAlt={"a hand writing down thoughts on a piece of paper"}
    >
      <article className="posts-overview">
        <h1>Posts</h1>
        <section>
          {posts.length > 0 && <OtherPostsPreview posts={posts} />}
        </section>
      </article>
    </Layout>
  );
};

export default Posts;

export const getStaticProps = async () => {
  const posts = allPosts
    .filter(
      ({ published }) => published || process.env.NODE_ENV === "development"
    )
    .map(({ slug, excerpt, cover, title, date }) => ({
      slug,
      excerpt,
      cover,
      title,
      date,
    }));

  posts.sort((post1, post2) => (post1.date > post2.date ? -1 : 1));

  return {
    props: { posts },
  };
};

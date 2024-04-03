import { Post, allPosts } from "@contentlayer/generated";
import Layout from "@components/layout";
import { HeroPostPreview, OtherPostsPreview } from "@components/post-preview";

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
      image={
        "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg"
      }
      url="posts"
      imageAlt={"a hand writing down thoughts on a piece of paper"}
    >
      <article className="main-content posts-overview">
        <section>
          {heroPost && <HeroPostPreview post={heroPost} />}
          {morePosts.length > 0 && <OtherPostsPreview posts={morePosts} />}
        </section>
      </article>
    </Layout>
  );
};

export default Posts;

export const getStaticProps = async () => {
  const posts = allPosts.map(({ slug, excerpt, cover, title, date }) => ({
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

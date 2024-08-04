import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import PostHeader from "@components/PostHeader";
import { OtherPostsPreview } from "@components/PostPreview";
import { ToTopButton } from "@components/ToTopButton";
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
      <main>
        <PostHeader
          subtitle="Longer Form Essays about Tech and Self-Improvement"
          title="Posts"
        />
        <article className="posts-overview">
          <section>
            {posts.length > 0 && <OtherPostsPreview posts={posts} />}
          </section>
        </article>
      </main>

      <footer>
        <NewsletterForm />
        <ToTopButton />
      </footer>
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

import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import Header from "@components/PostHeader";
import { OtherPostsPreview } from "@components/PostPreview";
import { ToTopButton } from "@components/ToTopButton";
import { Post, allPosts } from "@contentlayer/generated";
import { byOnlyPublished } from "src/lib/utils";
import React from "react";

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
        <section>
          <Header
            title="Posts"
            subtitle="Longer Form Essays about Tech and Self-Improvement"
          />
          <OtherPostsPreview posts={posts} />
        </section>
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
    .filter(byOnlyPublished)
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

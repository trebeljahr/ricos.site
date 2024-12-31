import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { OtherPostsPreview } from "@components/PostPreview";
import { ToTopButton } from "@components/ToTopButton";
import { posts as allPosts } from "@velite";
import { CommonMetadata, extractAndSortMetadata } from "src/lib/utils";

type Props = {
  posts: CommonMetadata[];
};

const Posts = ({ posts }: Props) => {
  const url = "posts";
  return (
    <Layout
      title="Posts - writings of a curious person, about life, the universe and everything"
      description="An overview page about all the posts that I have written so far on ricos.site, ordered by the date that they were published."
      image={
        "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg"
      }
      url={url}
      imageAlt={"a hand writing down thoughts on a piece of paper"}
      keywords={[
        "posts",
        "writings",
        "thoughts",
        "essays",
        "life",
        "curious",
        "all posts",
        "AI",
        "programming",
        "machine learning",
        "neuroscience",
        "biochemistry",
        "physics",
        "evolution",
        "engineering",
        "personal development",
        "growth",
        "productivity",
      ]}
    >
      <main className="mb-20 px-3">
        <BreadCrumbs path={url} />

        <section>
          <Header
            title="Posts"
            subtitle="Longer Form Essays about Tech and Self-Improvement"
          />
          <OtherPostsPreview posts={posts} />
        </section>
      </main>

      <footer className="mb-20 px-3">
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
};

export default Posts;

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const posts = extractAndSortMetadata(allPosts);

  return {
    props: { posts },
  };
};

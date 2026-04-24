import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { OtherPostsPreview } from "@components/PostPreview";
import { ToTopButton } from "@components/ToTopButton";
import type { CommonMetadata } from "src/@types";
import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";

import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";

type Props = {
  posts: CommonMetadata[];
  seo: SeoInfo | null;
};

const Posts = ({ posts, seo }: Props) => {
  const url = "posts";
  return (
    <Layout
      title={seo?.metaTitle || "Posts"}
      description={
        seo?.metaDescription ||
        "An overview page about all the posts that I have written so far on ricos.site, ordered by the date that they were published."
      }
      image={
        seo?.ogImage || "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg"
      }
      url={url}
      imageAlt={seo?.ogImageAlt || "a hand writing down thoughts on a piece of paper"}
      keywords={seo?.keywords || ["posts", "writings", "thoughts", "essays", "life"]}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />

        <section>
          <Header title="Posts" subtitle="Longer Form Essays about Tech and Self-Improvement" />
          <OtherPostsPreview posts={posts} />
        </section>

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
};

export default Posts;

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const allPosts = loadVeliteData("posts.json");
  const posts = extractAndSortMetadata(allPosts);

  return {
    props: { posts, seo: getSeoInfo("/posts") },
  };
};

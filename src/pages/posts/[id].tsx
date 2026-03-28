import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { ReadMore } from "@components/MoreStories";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import type { Post } from "@velite";
import { ReactNode } from "react";
import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";
import { byOnlyPublished } from "src/lib/utils/filters";
import { getRandom } from "src/lib/math/getRandom";

type Props = {
  children: ReactNode;
  morePosts: Post[];
  post: Post;
};

export const BlogLayout = ({
  children,
  morePosts,
  post: {
    excerpt,
    title,
    subtitle,
    date,
    cover,
    tags,
    slug,
    metaDescription,
    seoTitle,
    seoKeywords,
    seoOgImage,
    seoOgImageAlt,
    metadata: { readingTime, wordCount },
  },
}: Props) => {
  const url = `posts/${slug}`;
  return (
    <Layout
      description={metaDescription}
      title={seoTitle || title + " – " + subtitle}
      image={seoOgImage || cover.src}
      url={url}
      keywords={seoKeywords.length > 0 ? seoKeywords : tags.split(",")}
      imageAlt={seoOgImageAlt || cover.alt}
      withProgressBar={true}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <section>
          <BreadCrumbs path={url} />
          <MetadataDisplay date={date} readingTime={readingTime} />

          <Header subtitle={subtitle} title={title} />
          <div className="mb-5">
            <ImageWithLoader
              priority
              src={cover.src}
              width={780}
              height={780}
              alt={cover.alt}
              sizes="(max-width: 768px) calc(100vw - 24px), 65ch"
              className="w-full h-full"
            />
          </div>

          <div className="mx-auto max-w-prose mt-20">{children}</div>
        </section>

        <footer>
          <NewsletterForm />
          {morePosts && <ReadMore posts={morePosts} />}
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
};
type BlogProps = {
  post: Post;
  morePosts: Post[];
};

export default function PostComponent({ post, morePosts }: BlogProps) {
  return (
    <BlogLayout post={post} morePosts={morePosts}>
      <MDXContent source={post.content} />
    </BlogLayout>
  );
}

export async function getStaticPaths() {
  const posts = require("../../../.velite/posts.json");
  const paths = posts
    .filter(byOnlyPublished)
    .map(({ slug }: Post) => ({ params: { id: slug } }));

  return {
    paths:
      process.env.NODE_ENV === "development"
        ? [
            ...paths,
            { params: { id: "site-demo-post" } },
            { params: { id: "test" } },
          ]
        : paths,
    fallback: false,
  };
}

type Params = { params: { id: string } };

export async function getStaticProps({ params }: Params) {
  const posts = require("../../../.velite/posts.json");
  const post = posts
    .find((post: Post) => post.slug === params.id);
  const otherPosts = extractAndSortMetadata(posts).filter(
    (post: any) => post.slug !== params.id
  );

  const morePosts = getRandom(otherPosts, 3);

  return { props: { post, morePosts } };
}

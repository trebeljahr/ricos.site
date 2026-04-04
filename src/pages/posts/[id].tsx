import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import { JsonLd, BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import dynamic from "next/dynamic";

const MDXContentWithDemos = dynamic(
  () => import("@components/MDXContentWithDemos").then((m) => m.MDXContentWithDemos),
  { ssr: true }
);
import { MetadataDisplay } from "@components/MetadataDisplay";
import { ReadMore } from "@components/MoreStories";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { Backlinks } from "@components/Backlinks";
import { ToTopButton } from "@components/ToTopButton";
import type { Post } from "@velite";
import { ReactNode } from "react";

import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";
import { byOnlyPublished } from "src/lib/utils/filters";
import { getRelatedContent } from "src/lib/utils/getRelatedContent";

type BacklinkItem = { title: string; link: string; type: string };

type Props = {
  children: ReactNode;
  morePosts: Post[];
  post: Post;
  backlinks: BacklinkItem[];
};

export const BlogLayout = ({
  children,
  morePosts,
  backlinks,
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
  const fullTitle = seoTitle || title + " – " + subtitle;
  return (
    <Layout
      description={metaDescription}
      title={fullTitle}
      image={seoOgImage || cover.src}
      url={url}
      keywords={seoKeywords.length > 0 ? seoKeywords : tags.split(",")}
      imageAlt={seoOgImageAlt || cover.alt}
      withProgressBar={true}
      ogType="article"
      articlePublishedTime={date}
    >
      <JsonLd
        title={fullTitle}
        description={metaDescription}
        url={url}
        image={seoOgImage || cover.src}
        imageAlt={seoOgImageAlt || cover.alt}
        datePublished={date}
        type="article"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Posts", url: "/posts" },
          { name: title, url: `/${url}` },
        ]}
      />
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

        <footer className="mx-auto max-w-prose">
          <Backlinks items={backlinks} />
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
  backlinks: BacklinkItem[];
};

export default function PostComponent({ post, morePosts, backlinks }: BlogProps) {
  return (
    <BlogLayout post={post} morePosts={morePosts} backlinks={backlinks}>
      {post.hasDemos ? (
        <MDXContentWithDemos source={post.content} />
      ) : (
        <MDXContent source={post.content} />
      )}
    </BlogLayout>
  );
}

export async function getStaticPaths() {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const posts = loadVeliteData("posts.json");
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
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const { getBacklinks } = await import("src/lib/utils/getBacklinks");
  const posts = loadVeliteData("posts.json");
  const post = posts
    .find((post: Post) => post.slug === params.id);
  const publishedPosts = extractAndSortMetadata(posts);
  const morePosts = getRelatedContent(post, publishedPosts, 3);
  const backlinks = getBacklinks(post.link);

  return { props: { post, morePosts, backlinks } };
}

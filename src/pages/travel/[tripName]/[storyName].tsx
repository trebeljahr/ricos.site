import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import { JsonLd, BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { Backlinks } from "@components/Backlinks";
import { HorizontalCard } from "@components/NiceCards";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { NextAndPrevArrows } from "@components/NextAndPrevArrows";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import slugify from "@sindresorhus/slugify";
import type { Travelblog } from "@velite";
import { ReactNode } from "react";
import { byDate } from "src/lib/utils/sorting";
import { byOnlyPublished } from "src/lib/utils/filters";
import { replaceUndefinedWithNull } from "src/lib/utils/replaceUndefinedWithNull";

import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";
import { CommonMetadata } from "src/@types";

type BacklinkItem = { title: string; link: string; type: string };

type TravelBlogProps = {
  post: Travelblog;
  nextSlug: string | null;
  previousSlug: string | null;
  relatedStories: CommonMetadata[];
  backlinks: BacklinkItem[];
};

interface LayoutProps extends TravelBlogProps {
  children: ReactNode;
}

export const TravelBlogLayout = ({
  children,
  post: {
    excerpt,
    slug,
    cover,
    title,
    date,
    metadata: { readingTime },
    tags,
    parentFolder,
    metaDescription,
    seoTitle,
    seoKeywords,
    seoOgImage,
    seoOgImageAlt,
  },
  nextSlug,
  previousSlug,
  relatedStories,
  backlinks,
}: LayoutProps) => {
  const url = `travel/${parentFolder}/${slug}`;
  return (
    <Layout
      description={metaDescription}
      title={seoTitle || title}
      image={seoOgImage || cover?.src || ""}
      imageAlt={seoOgImageAlt || cover?.alt || ""}
      url={url}
      keywords={seoKeywords.length > 0 ? seoKeywords : ["travel", "blog", "adventure", "stories", ...tags]}
      withProgressBar={true}
      ogType="article"
      articlePublishedTime={date}
    >
      <JsonLd
        title={seoTitle || title}
        description={metaDescription}
        url={url}
        image={seoOgImage || cover?.src}
        imageAlt={seoOgImageAlt || cover?.alt}
        datePublished={date}
        type="article"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Travel", url: "/travel" },
          { name: parentFolder, url: `/travel/${parentFolder}` },
          { name: title, url: `/${url}` },
        ]}
      />
      <main className="py-20 px-3  max-w-5xl mx-auto">
        <BreadCrumbs path={url} />
        <MetadataDisplay date={date} readingTime={readingTime} />
        <Header title={title || ""} />

        <div className="mb-5">
          <ImageWithLoader
            priority
            src={cover.src}
            width={780}
            height={780}
            alt={cover.alt}
            sizes="100vw"
            style={{
              width: "100%",
              height: "auto",
              objectFit: "cover",
            }}
          />
        </div>

        <article className="mx-auto max-w-prose">{children}</article>

        <footer className="mx-auto max-w-prose">
          <NewsletterForm />
          {relatedStories.length > 0 && (
            <div className="mt-10">
              <h2>More travel stories</h2>
              {relatedStories.map((story) => (
                <HorizontalCard
                  key={story.slug}
                  cover={story.cover}
                  link={story.link}
                  title={story.title}
                  excerpt={story.excerpt}
                  date={story.date}
                  readingTime={story.metadata?.readingTime}
                />
              ))}
            </div>
          )}
          <NextAndPrevArrows nextPost={nextSlug} prevPost={previousSlug} />
          <Backlinks items={backlinks} />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
};

export default function PostComponent({
  post,
  previousSlug,
  nextSlug,
  relatedStories,
  backlinks,
}: TravelBlogProps) {
  return (
    <TravelBlogLayout
      post={post}
      previousSlug={previousSlug}
      nextSlug={nextSlug}
      relatedStories={relatedStories}
      backlinks={backlinks}
    >
      <MDXContent source={post.content} />
    </TravelBlogLayout>
  );
}

type Params = { params: { storyName: string; tripName: string } };

export async function getStaticPaths() {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const travelblogs = loadVeliteData("travelblogs.json");
  const paths: Params[] = extractAndSortMetadata(travelblogs).map(
    ({ slug, parentFolder }: any) => ({
      params: {
        tripName: slugify(parentFolder as string),
        storyName: slug,
      },
    })
  );

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({
  params: { storyName, tripName },
}: Params) {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const { getRelatedContent } = await import("src/lib/utils/getRelatedContent");
  const travelblogs: Travelblog[] = loadVeliteData("travelblogs.json");
  const allPublished = travelblogs.filter(byOnlyPublished);
  const stories = allPublished
    .sort(byDate)
    .reverse()
    .filter(({ parentFolder }) => tripName === parentFolder);

  const currentIndex = stories.findIndex((post) => post.slug === storyName);

  const travelingStory = stories[currentIndex];
  const prevIndex = currentIndex - 1;
  const nextIndex = currentIndex + 1;

  const previousSlug = prevIndex >= 0 ? stories[prevIndex].slug : null;
  const nextSlug = nextIndex < stories.length ? stories[nextIndex].slug : null;

  // Related stories from OTHER trips (cross-trip discovery)
  const otherTripStories = allPublished.filter(
    ({ parentFolder }) => parentFolder !== tripName
  );
  const { toOnlyMetadata } = await import("src/lib/utils/toOnlyMetadata");
  const relatedStories = getRelatedContent(
    travelingStory,
    otherTripStories,
    3
  ).map((s: Travelblog) => toOnlyMetadata(s));

  const { getBacklinks } = await import("src/lib/utils/getBacklinks");
  const backlinks = getBacklinks(travelingStory.link);

  return {
    props: {
      post: replaceUndefinedWithNull(travelingStory),
      nextSlug,
      previousSlug,
      relatedStories,
      backlinks,
    },
  };
}

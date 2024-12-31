import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { NextAndPrevArrows } from "@components/NextAndPrevArrows";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import slugify from "@sindresorhus/slugify";
import { travelblogs, type Travelblog } from "@velite";
import { ReactNode } from "react";
import {
  byDate,
  byOnlyPublished,
  extractAndSortMetadata,
  replaceUndefinedWithNull,
} from "src/lib/utils";

type TravelBlogProps = {
  post: Travelblog;
  nextSlug: string | null;
  previousSlug: string | null;
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
  },
  nextSlug,
  previousSlug,
}: LayoutProps) => {
  const url = `travel/${parentFolder}/${slug}`;
  return (
    <Layout
      description={excerpt || ""}
      title={title}
      image={cover?.src || ""}
      imageAlt={cover?.alt || ""}
      url={url}
      keywords={["travel", "blog", "adventure", "stories", ...tags]}
      withProgressBar={true}
    >
      <main className="mb-20 px-3">
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
      </main>

      <footer className="mb-20 px-3">
        <ToTopButton />
        <NewsletterForm />
        <NextAndPrevArrows nextPost={nextSlug} prevPost={previousSlug} />
      </footer>
    </Layout>
  );
};

export default function PostComponent({
  post,
  previousSlug,
  nextSlug,
}: TravelBlogProps) {
  return (
    <TravelBlogLayout
      post={post}
      previousSlug={previousSlug}
      nextSlug={nextSlug}
    >
      <MDXContent source={post.content} />
    </TravelBlogLayout>
  );
}

type Params = { params: { storyName: string; tripName: string } };

export async function getStaticPaths() {
  const paths: Params[] = extractAndSortMetadata(travelblogs).map(
    ({ slug, parentFolder }) => ({
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
  const stories = travelblogs
    .filter(byOnlyPublished)
    .sort(byDate)
    .reverse()
    .filter(({ parentFolder }) => tripName === parentFolder);

  const currentIndex = stories.findIndex((post) => post.slug === storyName);

  const travelingStory = stories[currentIndex];
  const prevIndex = currentIndex - 1;
  const nextIndex = currentIndex + 1;

  const previousSlug = prevIndex >= 0 ? stories[prevIndex].slug : null;
  const nextSlug = nextIndex < stories.length ? stories[nextIndex].slug : null;

  return {
    props: {
      post: replaceUndefinedWithNull(travelingStory),
      nextSlug,
      previousSlug,
    },
  };
}

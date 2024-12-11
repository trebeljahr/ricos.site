import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { NewsletterForm } from "@components/NewsletterSignup";
import { NextAndPrevArrows } from "@components/NextAndPrevArrows";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import slugify from "@sindresorhus/slugify";
import { travelblogs, type Travelblog } from "@velite";
import { ReactNode } from "react";
import { replaceUndefinedWithNull, sortAndFilterNotes } from "src/lib/utils";
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
  post: { excerpt, slug, cover, title, date, parentFolder },
  nextSlug,
  previousSlug,
}: LayoutProps) => {
  const url = `travel/${parentFolder}/${slug}`;
  return (
    <Layout
      description={excerpt || ""}
      title={title}
      image={cover?.src || ""}
      url={url}
      imageAlt={cover?.alt || ""}
    >
      <main>
        <BreadCrumbs path={url} />
        <article>
          <Header title={title || ""} date={date} />
          {children}
        </article>
      </main>

      <footer>
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
  const paths: Params[] = sortAndFilterNotes(travelblogs).map(
    ({ slug, parentFolder }) => ({
      params: {
        tripName: slugify(parentFolder),
        storyName: slug,
      },
    })
  );

  console.log(paths);

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({
  params: { storyName, tripName },
}: Params) {
  const stories = sortAndFilterNotes(travelblogs, tripName);
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

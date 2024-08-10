import { BreadCrumbs } from "@components/BreadCrumbs";
import { MarkdownRenderers } from "@components/CustomRenderers";
import { NextAndPrevArrows } from "@components/NextAndPrevArrows";
import { ToTopButton } from "@components/ToTopButton";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import {
  allNotes as allTravelStories,
  type Note,
} from "@contentlayer/generated";
import slugify from "@sindresorhus/slugify";
import { useMDXComponent } from "next-contentlayer/hooks";
import { replaceUndefinedWithNull, sortAndFilterNotes } from "src/lib/utils";
import { NewsletterForm } from "@components/NewsletterSignup";

type TravelBlogProps = {
  post: Note;
  nextSlug: string | null;
  previousSlug: string | null;
};

interface LayoutProps extends TravelBlogProps {
  children: React.ReactNode;
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
  const Component = useMDXComponent(post.body.code);

  return (
    <TravelBlogLayout
      post={post}
      previousSlug={previousSlug}
      nextSlug={nextSlug}
    >
      <Component components={{ ...MarkdownRenderers }} />
    </TravelBlogLayout>
  );
}

type Params = { params: { storyName: string; tripName: string } };

export async function getStaticPaths() {
  const paths: Params[] = sortAndFilterNotes(allTravelStories).map(
    ({ slug, parentFolder }) => ({
      params: {
        tripName: slugify(parentFolder),
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
  const stories = sortAndFilterNotes(allTravelStories, tripName);
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

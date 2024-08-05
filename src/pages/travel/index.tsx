import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { NiceCard } from "@components/NiceCard";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { allNotes, type Note } from "@contentlayer/generated";
import { toTitleCase } from "src/lib/toTitleCase";

type MetaInfo = {
  cover: { src: string; alt: string };
  excerpt: string;
  title: string;
};

type Props = {
  posts: string[];
};

const travelingStoriesMeta: Record<string, MetaInfo> = {
  guadeloupe: {
    cover: {
      src: "/Attachments/Photography/Guadeloupe/meditating-in-front-of-the-third-carbet-fall.jpg",
      alt: "meditating in front of the third carbet fall",
    },
    title: "Guadeloupe",
    excerpt:
      "Traveling in Guadeloupe was beautiful. A time filled with stories, waterfalls, nice people, crazy hikes, and diving adventures. If I can I'll come back to this paradise in the Carribean once again in the future.",
  },
  transat: {
    cover: {
      src: "/Attachments/Photography/Transat/christian-and-rebecca-steering-the-boat-through-the-storm.jpg",
      alt: "Christian and Rebecca steering the boat through the storm",
    },
    title: "Crossing the Atlantic",
    excerpt:
      "Navigating across the Atlantic Ocean was one of the craziest experiences in my entire life. I've never sailed before and hitchhiking a boat without any sailing experience has made my life richer by a lot.",
  },
};

const Notes = ({ posts }: Props) => {
  const url = "/travel";

  return (
    <Layout
      title="Traveling Stories"
      description="An overview page about the traveling stories I have to tell"
      image={
        "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg"
      }
      url="posts"
      imageAlt={"a hand writing down thoughts on a piece of paper"}
    >
      <main>
        <section>
          <Header
            title="Traveling"
            subtitle="Stories of the adventures and places I have been to"
          />
          {posts.map((post) => {
            const meta = travelingStoriesMeta[post];
            if (!meta) return null;

            return (
              <NiceCard
                key={post}
                cover={meta.cover}
                excerpt={meta.excerpt}
                title={meta.title}
                slug={`/travel/${post}`}
              />
            );
          })}
        </section>
      </main>

      <footer>
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
};

export default Notes;

export const travelingStoryNames = [
  ...allNotes.reduce((agg, current) => {
    if (current.published) agg.add(current.parentFolder);
    return agg;
  }, new Set<string>()),
];

export const travelingStoryNamesMap = allNotes.reduce((agg, current) => {
  agg[current.parentFolder] = current.path.split("/").at(-2);
  return agg;
}, {} as Record<string, any>);

export const getStaticProps = async () => {
  return {
    props: { posts: travelingStoryNames },
  };
};

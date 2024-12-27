import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { NiceCard } from "@components/NiceCard";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { Travelblog, travelblogs } from "@velite";
import { byOnlyPublished } from "src/lib/utils";

type MetaInfo = {
  cover: { src: string; alt: string };
  excerpt: string;
  title: string;
  subtitle: string;
};

type TravelBlogMeta = Pick<
  Travelblog,
  "title" | "excerpt" | "date" | "cover" | "metadata" | "parentFolder"
>;

type Props = {
  travelingStories: string[];
  travelingBlogsMeta: TravelBlogMeta[];
};

export const travelingStoriesMeta: Record<string, MetaInfo> = {
  guadeloupe: {
    cover: {
      src: "/assets/blog/guadeloupe/meditating-in-front-of-the-third-carbet-fall.jpg",
      alt: "meditating in front of the third carbet fall",
    },
    title: "Guadeloupe",
    subtitle: "An Island of Jungle Hikes, Beaches, and Coral Reefs",
    excerpt:
      "Traveling in Guadeloupe was beautiful. A time filled with stories, waterfalls, nice people, crazy hikes, and diving adventures. If I can I'll come back to this paradise in the Carribean once again in the future.",
  },
  transat: {
    cover: {
      src: "/assets/blog/transat/christian-and-rebecca-steering-the-boat-through-the-storm.jpg",
      alt: "Christian and Rebecca steering the boat through the storm",
    },
    title: "Crossing the Atlantic",
    subtitle: "18 days, an 11 Meter Boat, 3 people and Lots of Fun",
    excerpt:
      "Navigating across the Atlantic Ocean was one of the craziest experiences in my entire life. I've never sailed before and hitchhiking a boat without any sailing experience has made my life richer by a lot.",
  },
  "portugal-2024": {
    cover: {
      src: "/assets/blog/portugal-2024/starry-night.jpg",
      alt: "starry night in portugal",
    },
    title: "Portugal - The Fisherman's Trail",
    subtitle: "Hiking Along the Rota Vicente for a Few Days",
    excerpt:
      "Walking along the Rota Vicente, a popular hiking trail following the South West coast of Portugal made me appreciate the beauty of this country. The coastline is a natural paradise, beckoning to be explored.",
  },

  "martinique-2024": {
    cover: {
      src: "/assets/blog/martinique-2024/anse-du-sinai-panorama.jpg",
      alt: "panorama shot of the Anse du Sinai beach in Martinique",
    },
    title: "Martinique",
    subtitle: "Spending a Couple of Days in this Paradise",
    excerpt:
      "Martinique is a beautiful little island in the Carribean, with lots of jungle, pristine beaches, some crazy old trees, good rhum and friendly people. I hitchhiked around the island for 5 days and want to come back for sure!",
  },
};

const TravelBlogs = ({ travelingStories, travelingBlogsMeta }: Props) => {
  const cardContent = travelingStories
    .map((story, index) => {
      const meta = travelingStoriesMeta[story] || {
        cover: { src: "", alt: "default cover" },
        title: story,
      };

      const currentBlogs = travelingBlogsMeta.filter(
        (blog) => blog.parentFolder === story
      );
      const { date, readingTime } = currentBlogs.reduce(
        (agg, current) => {
          const currentDate = new Date(current.date);
          return {
            date: currentDate > agg.date ? currentDate : agg.date,
            readingTime: agg.readingTime + current.metadata.readingTime,
          };
        },
        { date: new Date(0), readingTime: 0 }
      );

      return { meta, date, readingTime, story };
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1));

  return (
    <Layout
      title="Traveling Stories"
      description="An overview page about the traveling stories I have to tell"
      image={"/assets/blog/traveling-van.png"}
      imageAlt={
        "a traveling van sitting in the middle of nowhere in the forest"
      }
      url="travel"
      keywords={[
        "travel",
        "blog",
        "adventures",
        "stories",
        "traveling",
        "travel stories",
        "Guadeloupe",
        "Martinique",
        "Portugal",
        "Atlantic Crossing",
        "sailing",
        "hiking",
        "diving",
        "Carribean",
        "adventure",
      ]}
    >
      <main className="mb-20 px-3">
        <BreadCrumbs path="travel" />

        <section>
          <Header
            title="Traveling"
            subtitle="Stories of the adventures and places I have been to"
          />
          {cardContent.map(({ story, meta, date, readingTime }, index) => {
            return (
              <NiceCard
                key={story}
                cover={meta.cover}
                excerpt={meta.excerpt}
                priority={index === 0}
                title={meta.title}
                date={date.toISOString()}
                readingTime={readingTime}
                link={`/travel/${story}`}
              />
            );
          })}
        </section>
      </main>

      <footer className="mb-20 px-3">
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
};

export default TravelBlogs;

export const travelingStoryNames = [
  ...travelblogs.filter(byOnlyPublished).reduce((agg, current) => {
    agg.add(current.parentFolder);
    return agg;
  }, new Set<string>()),
];

export const travelingStoryNamesMap = travelblogs.reduce((agg, current) => {
  agg[current.parentFolder] = current.path.split("/").at(-2);
  return agg;
}, {} as Record<string, any>);

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const travelingBlogsMeta = travelblogs
    .filter(byOnlyPublished)
    .map(({ title, excerpt, date, cover, metadata, parentFolder }) => ({
      title,
      cover,
      date,
      excerpt,
      metadata,
      parentFolder,
    }));

  return {
    props: { travelingStories: travelingStoryNames, travelingBlogsMeta },
  };
};

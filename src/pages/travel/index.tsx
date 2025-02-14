import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import { HorizontalCard } from "@components/NiceCards";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { travelblogs } from "@velite";
import { getImgWidthAndHeightDuringBuild } from "src/lib/getImgWidthAndHeightDuringBuild";
import { byOnlyPublished, CommonMetadata } from "src/lib/utils";

type MetaInfo = {
  cover: { src: string; alt: string };
  excerpt: string;
  title: string;
  subtitle: string;
};

type CardContent = {
  meta: MetaInfo & {
    cover: CommonMetadata["cover"];
  };
  date: string;
  readingTime: number;
  story: string;
  amountOfStories: number;
};

type Props = {
  cardContent: CardContent[];
};

export const travelingStoriesMetaRaw: Record<string, MetaInfo> = {
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
  dominica: {
    cover: {
      src: "/assets/blog/dominica/PXL_20240506_203704114.LONG_EXPOSURE-01.COVER~2.jpg",
      alt: "long exposure of one of the two Trafalgar Falls called Mama falls",
    },
    title: "Dominica",
    subtitle:
      "Volcanic Activity, Hotsprings and crazy Waterfalls on a laid back Island in the Carribean",
    excerpt:
      "In Dominica you can feel the volcanic activity everywhere. The island is covered in lush jungle, has some of the most beautiful waterfalls I've ever seen in my life and places that are just out of this world. Boiling lakes, hot springs next to giant waterfalls, bubbling thermal vents in the ocean, and a laid back vibe that makes you want to stay forever.",
  },
};

const TravelBlogs = ({ cardContent }: Props) => {
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
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path="travel" />

        <section>
          <Header
            title="Traveling"
            subtitle="Stories of the adventures and places I have been to"
          />
          {cardContent.map(({ story, meta, date, amountOfStories }, index) => {
            return (
              <HorizontalCard
                key={story}
                cover={meta.cover}
                excerpt={meta.excerpt}
                priority={index === 0}
                title={meta.title}
                date={date}
                // readingTime={readingTime}
                amountOfStories={amountOfStories}
                link={`/travel/${story}`}
              />
            );
          })}
        </section>

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
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

  const travelingStoriesMeta = {} as Record<
    string,
    MetaInfo & { cover: CommonMetadata["cover"] }
  >;

  const keys = Object.keys(travelingStoriesMetaRaw);
  for (const key of keys) {
    const val = travelingStoriesMetaRaw[key];
    const { width, height } = await getImgWidthAndHeightDuringBuild(
      val.cover.src
    );
    travelingStoriesMeta[key] = {
      ...val,
      cover: { ...val.cover, width, height },
    };
  }
  const cardContent = travelingStoryNames
    .map((story) => {
      const meta = travelingStoriesMeta[story] || {
        cover: { src: "", alt: "default cover" },
        title: story,
      };

      const currentBlogs = travelingBlogsMeta.filter(
        (blog) => blog.parentFolder === story
      );
      const { date, readingTime, amountOfStories } = currentBlogs.reduce(
        (agg, current) => {
          const currentDate = new Date(current.date);
          return {
            date: currentDate > agg.date ? currentDate : agg.date,
            readingTime: agg.readingTime + current.metadata.readingTime,
            amountOfStories: agg.amountOfStories + 1,
          };
        },
        { date: new Date(0), readingTime: 0, amountOfStories: 0 }
      );

      return {
        meta,
        date,
        readingTime,
        story,
        amountOfStories,
      };
    })
    .sort((a, b) => (a.date > b.date ? -1 : 1))
    .map((cardContent) => ({
      ...cardContent,
      date: cardContent.date.toDateString(),
    }));

  return {
    props: {
      cardContent,
    },
  };
};

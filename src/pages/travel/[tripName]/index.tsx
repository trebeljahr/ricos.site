import { BreadCrumbs, turnKebabIntoTitleCase } from "@components/BreadCrumbs";
import { byDates } from "src/lib/dateUtils";
import Layout from "@components/Layout";
import { OtherPostsPreview } from "@components/PostPreview";
import { allNotes, type Note } from "@contentlayer/generated";
import slugify from "@sindresorhus/slugify";
import { travelingStoryNames } from "..";
import { sortAndFilterNotes } from "src/lib/utils";
import { NiceCard } from "@components/NiceCard";
import Header from "@components/PostHeader";

type Props = {
  posts: Note[];
  tripName: string;
};

const Traveling = ({ posts, tripName }: Props) => {
  const url = "/travel/" + tripName;
  return (
    <Layout
      title={`${tripName}`}
      description={`An overview page for the stories of ${tripName}.`}
      image={
        "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg"
      }
      url="posts"
      imageAlt={"a hand writing down thoughts on a piece of paper"}
    >
      <main>
        <BreadCrumbs path={url} />
        <section>
          <Header
            title={turnKebabIntoTitleCase(tripName)}
            subtitle="Traveling Stories from Another Place"
          />
          {posts.map((post, index) => {
            const priority = index <= 1;
            return <NiceCard key={post.slug} priority={priority} {...post} />;
          })}
        </section>
      </main>
    </Layout>
  );
};

export default Traveling;

type Params = {
  params: { tripName: string };
};

export const getStaticPaths = async () => {
  return {
    paths: travelingStoryNames.map<Params>((post) => ({
      params: { tripName: post },
    })),
    fallback: false,
  };
};

export const getStaticProps = async ({ params }: Params) => {
  const posts = sortAndFilterNotes(allNotes, params.tripName).map(
    ({ parentFolder, title, slug, excerpt, date, cover }) => {
      return {
        title,
        cover,
        date,
        excerpt,
        slug: slugify(parentFolder) + "/" + slug,
      };
    }
  );

  return {
    props: { posts, tripName: params.tripName },
  };
};

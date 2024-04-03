import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { allNotes } from "@contentlayer/generated";
import slugify from "@sindresorhus/slugify";
import Link from "next/link";

type Props = {
  posts: string[];
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
      <article className="main-content posts-overview">
        <section>
          <BreadCrumbs path={url} />
        </section>
        <section>
          {posts.map((post) => {
            return (
              <div key={post}>
                <Link href={`/travel/${post}`}>
                  {travelingStoryNamesMap[post]}
                </Link>
              </div>
            );
          })}
        </section>
      </article>
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

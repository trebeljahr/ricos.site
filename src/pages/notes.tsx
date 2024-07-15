import { Post as Note, allNotes } from "@contentlayer/generated";
import Layout from "@components/Layout";
import { HeroPostPreview, OtherPostsPreview } from "@components/PostPreview";
import { parseDate } from "src/lib/dateUtils";

type Props = {
  posts: Note[];
};

const Notes = ({ posts }: Props) => {
  const heroPost = posts[0];
  const morePosts = posts.slice(1);
  return (
    <Layout
      title="Notes - as of yet unstructured writing"
      description="An overview page about the notes on trebeljahr.com"
      image={
        "/assets/midjourney/a-hand-writing-down-thoughts-on-a-piece-of-paper.jpg"
      }
      url="posts"
      imageAlt={"a hand writing down thoughts on a piece of paper"}
    >
      <article className="main-content prose posts-overview">
        <section>
          {heroPost && <HeroPostPreview post={heroPost} />}
          {morePosts.length > 0 && <OtherPostsPreview posts={morePosts} />}
        </section>
      </article>
    </Layout>
  );
};

export default Notes;

export const getStaticProps = async () => {
  const notes = allNotes
    .map(({ slug, excerpt, cover, title, date, published }) => ({
      slug: "/notes/" + slug,
      excerpt,
      cover,
      title,
      date,
      published,
    }))
    .filter(({ published }) => published)
    .sort((note1, note2) => {
      const date1 = parseDate(note1?.date);
      const date2 = parseDate(note2?.date);

      return date1.getTime() > date2.getTime() ? -1 : 1;
    });

  return {
    props: { posts: notes },
  };
};

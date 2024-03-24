import { Post as Note, allNotes } from "@contentlayer/generated";
import Layout from "../components/layout";
import { HeroPostPreview, OtherPostsPreview } from "../components/post-preview";

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
      <article className="posts-overview">
        <section className="main-section">
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
      date: date || 0,
      published,
    }))
    .filter(({ published }) => published)
    .sort((note1, note2) => ((note1?.date || 0) > (note2?.date || 0) ? -1 : 1));

  return {
    props: { posts: notes },
  };
};

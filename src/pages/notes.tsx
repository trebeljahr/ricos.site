import { Post as Note, allNotes } from "@contentlayer/generated";
import Layout from "../components/layout";
import { HeroPostPreview, OtherPostsPreview } from "../components/post-preview";

type Props = {
  posts: Note[];
};

const Posts = ({ posts }: Props) => {
  const heroPost = posts[0];
  const morePosts = posts.slice(1);
  return (
    <Layout
      title="Posts - writings of a curious person, about life, the universe and everything"
      description="An overview page about all the posts that I have written so far on trebeljahr.com, ordered by the date that they were published."
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

export default Posts;

export const getStaticProps = async () => {
  const posts = allNotes.map(
    ({ slug, excerpt, ogImage: cover, title, date, author }) => ({
      slug: "/notes/" + slug,
      excerpt: excerpt || "",
      cover: cover || "",
      title: slug,
      date: date || 0,
      author: author || "",
    })
  );
  posts.sort((post1, post2) =>
    (post1?.date || 0) > (post2?.date || 0) ? -1 : 1
  );

  return {
    props: { posts },
  };
};

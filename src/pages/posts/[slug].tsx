import { useRouter } from "next/router";
import ErrorPage from "next/error";
import PostBody from "../../components/post-body";
import PostHeader from "../../components/post-header";
import Layout from "../../components/layout";
import { getPostBySlug, getAllPosts, getAllMarkdownPosts } from "../../lib/api";
import { ReadMore } from "../../components/more-stories";
import { ToTopButton } from "../../components/ToTopButton";
import { Post as PostType } from "../../@types/post";
import { NewsletterForm } from "../../components/newsletter-signup";
import { getRandom } from "src/lib/math/getRandom";

type Props = {
  post: PostType;
  morePosts: PostType[];
};

const Post = ({ post, morePosts }: Props) => {
  return (
    <Layout
      description={post.excerpt}
      title={post.title + " – " + post.subtitle}
    >
      <article className="post-body">
        <section className="main-section">
          <PostHeader
            subtitle={post.subtitle}
            title={post.title}
            date={post.date}
            author={post.author}
          />
          <PostBody content={post.content} />
        </section>
        <section className="main-section">
          {morePosts && <ReadMore posts={morePosts} />}
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
};

export default Post;

type Params = {
  params: {
    slug: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const post = await getPostBySlug(params.slug + ".md", [
    "title",
    "subtitle",
    "date",
    "slug",
    "author",
    "excerpt",
    "content",
    "cover",
  ]);
  const bySlug = (otherPost: any) => otherPost.slug !== post.slug;
  const otherPosts = (await getAllPosts(["title", "slug", "excerpt"])).filter(
    bySlug
  );
  const morePosts = getRandom(otherPosts, 3);

  return {
    props: {
      post,
      morePosts,
    },
  };
}

export async function getStaticPaths() {
  const posts = await getAllMarkdownPosts(["slug"]);

  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug,
        },
      };
    }),
    fallback: false,
  };
}

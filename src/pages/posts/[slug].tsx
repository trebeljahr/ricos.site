import { useRouter } from "next/router";
import ErrorPage from "next/error";
import PostBody from "../../components/post-body";
import PostHeader from "../../components/post-header";
import Layout from "../../components/layout";
import { getPostBySlug, getAllPosts, getAllMarkdownPosts } from "../../lib/api";
import { ReadMore } from "../../components/more-stories";
import { UtteranceComments } from "../../components/comments";
import { ToTopButton } from "../../components/ToTopButton";
import { Post as PostType } from "../../@types/post";
import { NewsletterForm } from "../../components/newsletter-signup";

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
          <UtteranceComments />
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

function getRandom(arr: any[], n: number) {
  var result = new Array(n),
    len = arr.length,
    taken = new Array(len);
  if (n > len)
    throw new RangeError("getRandom: more elements taken than available");
  while (n--) {
    var x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

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

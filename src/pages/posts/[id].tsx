import PostHeader from "@components/PostHeader";
import Layout from "@components/Layout";
import { useMDXComponent } from "next-contentlayer/hooks";
import { allPosts, Post } from "@contentlayer/generated";
import { NewsletterForm } from "@components/NewsletterSignup";
import { ToTopButton } from "@components/ToTopButton";
import { ReadMore } from "@components/MoreStories";
import { getRandom } from "src/lib/math/getRandom";
import { MarkdownRenderers } from "@components/CustomRenderers";
import { BreadCrumbs } from "@components/BreadCrumbs";

type Props = {
  children: React.ReactNode;
  morePosts: Post[];
  post: Post;
};

export const BlogLayout = ({
  children,
  morePosts,
  post: { excerpt, title, subtitle, date, cover, id },
}: Props) => {
  const url = `posts/${id}`;
  return (
    <Layout
      description={excerpt}
      title={title + " – " + subtitle}
      image={cover.src}
      url={url}
      imageAlt={cover.alt}
    >
      <main>
        <article>
          <section>
            <BreadCrumbs path={url} />

            <PostHeader subtitle={subtitle} title={title} date={date} />
            {children}
          </section>
        </article>
      </main>

      <footer>
        <NewsletterForm />
        {morePosts && <ReadMore posts={morePosts} />}
        <ToTopButton />
      </footer>
    </Layout>
  );
};
type BlogProps = {
  post: Post;
  morePosts: Post[];
};

export default function PostComponent({ post, morePosts }: BlogProps) {
  const Component = useMDXComponent(post.body.code);

  return (
    <BlogLayout post={post} morePosts={morePosts}>
      <Component components={{ ...MarkdownRenderers }} />
    </BlogLayout>
  );
}

export async function getStaticPaths() {
  return {
    paths: allPosts.map(({ id }) => ({ params: { id } })),
    fallback: false,
  };
}

type Params = { params: { id: string } };

export async function getStaticProps({ params }: Params) {
  const post = allPosts.find((post: Post) => post.id === params.id);
  const otherPosts = allPosts
    .filter((post) => post.id !== params.id)
    .map(({ title, slug, cover, id, excerpt }) => ({
      title,
      slug,
      cover,
      id,
      excerpt,
    }));
  const morePosts = getRandom(otherPosts, 3);

  return { props: { post, morePosts } };
}

import PostHeader from "../../components/post-header";
import Layout from "../../components/layout";
import { useMDXComponent } from "next-contentlayer/hooks";
import { allPosts, Post } from "contentlayer/generated";
import { NewsletterForm } from "../../components/newsletter-signup";
import { ToTopButton } from "../../components/ToTopButton";
import { ReadMore } from "../../components/more-stories";
import { getRandom } from "src/lib/math/getRandom";
import { MarkdownRenderers } from "src/components/CustomRenderers";

type Props = {
  children: React.ReactNode;
  morePosts: Post[];
  post: Post;
};

export const BlogLayout = ({
  children,
  morePosts,
  post: { excerpt, title, subtitle, date, author },
}: Props) => (
  <Layout description={excerpt} title={title + " – " + subtitle}>
    <article>
      <section className="main-section main-text post-body">
        <PostHeader
          subtitle={subtitle}
          title={title}
          date={date}
          author={author}
        />
        {children}
      </section>
      <section className="main-section">
        {morePosts && <ReadMore posts={morePosts} />}
        <NewsletterForm />
        <ToTopButton />
      </section>
    </article>
  </Layout>
);

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
    .map(({ title, slug }) => ({ title, slug }));
  console.log({ otherPosts });
  const morePosts = getRandom(otherPosts, 3);
  console.log({ morePosts });

  return { props: { post, morePosts } };
}

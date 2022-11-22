import { useMDXComponent } from "next-contentlayer/hooks";
import { allPosts } from "contentlayer/generated";
import type { Post as PostType } from "contentlayer/generated";

import PostHeader from "../../components/post-header";
import Layout from "../../components/layout";
import { NewsletterForm } from "../../components/newsletter-signup";
import { ToTopButton } from "../../components/ToTopButton";
import { ReadMore } from "../../components/more-stories";
import { getRandom } from "src/lib/math/getRandom";

type Props = {
  children: React.ReactNode;
  morePosts: { slug: string; title: string }[];
  post: PostType;
};

export const BlogLayout = ({
  children,
  morePosts,
  post: { excerpt, title, subtitle, date, author },
}: Props) => (
  <Layout description={excerpt} title={title + " – " + subtitle}>
    <article className="post-body">
      <section className="main-section main-text">
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
  post: PostType;
  morePosts: { slug: string; title: string }[];
};

export default function PostComponent({ post, morePosts }: BlogProps) {
  console.log(post);
  console.log(morePosts);
  const Component = useMDXComponent(post.body.code);

  return (
    <BlogLayout post={post} morePosts={morePosts}>
      <Component />
    </BlogLayout>
  );
}

export async function getStaticPaths() {
  console.log("from contentlayer stuff", allPosts);

  return {
    paths: allPosts.map((post: PostType) => ({ params: { slug: post.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }: { params: { slug: string } }) {
  const post = allPosts.find((post: PostType) => post.slug === params.slug);
  const otherPosts = allPosts
    .filter((post) => post.slug !== params.slug)
    .map(({ slug, title }) => ({ slug, title }));
  console.log(post);
  console.log(otherPosts);

  const morePosts = getRandom(otherPosts, 3);
  console.log(morePosts);

  return { props: { post, morePosts } };
}

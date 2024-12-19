import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { ReadMore } from "@components/MoreStories";
import { NewsletterModalPopup } from "@components/NewsletterModalPopup";
import { NewsletterForm } from "@components/NewsletterSignup";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { Post, posts } from "@velite";
import { ReactNode } from "react";
import { getRandom } from "src/lib/math/getRandom";
import { byOnlyPublished } from "src/lib/utils";

type Props = {
  children: ReactNode;
  morePosts: Post[];
  post: Post;
};

export const BlogLayout = ({
  children,
  morePosts,
  post: { excerpt, title, subtitle, date, cover, slug },
}: Props) => {
  const url = `posts/${slug}`;
  return (
    <Layout
      description={excerpt}
      title={title + " – " + subtitle}
      image={cover.src}
      url={url}
      imageAlt={cover.alt}
      withProgressBar={true}
    >
      <main>
        <article>
          <section>
            <BreadCrumbs path={url} />

            <Header subtitle={subtitle} title={title} date={date} />
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
  return (
    <BlogLayout post={post} morePosts={morePosts}>
      <MDXContent source={post.content} />
    </BlogLayout>
  );
}

export async function getStaticPaths() {
  const paths = posts
    .filter(byOnlyPublished)
    .map(({ slug }) => ({ params: { id: slug } }));

  return {
    paths:
      process.env.NODE_ENV === "development"
        ? [...paths, { params: { id: "site-demo-post" } }]
        : paths,
    fallback: false,
  };
}

type Params = { params: { id: string } };

export async function getStaticProps({ params }: Params) {
  const post = posts
    // .filter(byOnlyPublished)
    .find((post: Post) => post.slug === params.id);
  const otherPosts = posts
    .filter(byOnlyPublished)
    .filter((post) => post.slug !== params.id)
    .map(({ title, cover, slug, excerpt }) => ({
      title,
      slug,
      cover,
      excerpt,
    }));
  const morePosts = getRandom(otherPosts, 3);

  return { props: { post, morePosts } };
}

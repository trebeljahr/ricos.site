import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { ReadMore } from "@components/MoreStories";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { Post, posts } from "@velite";
import { ReactNode } from "react";
import { getRandom } from "src/lib/math/getRandom";
import { byOnlyPublished, extractAndSortMetadata } from "src/lib/utils";

type Props = {
  children: ReactNode;
  morePosts: Post[];
  post: Post;
};

export const BlogLayout = ({
  children,
  morePosts,
  post: {
    excerpt,
    title,
    subtitle,
    date,
    cover,
    tags,
    slug,
    metadata: { readingTime, wordCount },
  },
}: Props) => {
  const url = `posts/${slug}`;
  return (
    <Layout
      description={excerpt}
      title={title + " – " + subtitle}
      image={cover.src}
      url={url}
      keywords={tags.split(",")}
      imageAlt={cover.alt}
      withProgressBar={true}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <section>
          <BreadCrumbs path={url} />
          <MetadataDisplay date={date} readingTime={readingTime} />

          <Header subtitle={subtitle} title={title} />
          <div className="mb-5">
            <ImageWithLoader
              priority
              src={cover.src}
              width={780}
              height={780}
              alt={cover.alt}
              sizes="100vw"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "cover",
              }}
            />
          </div>

          <div className="mx-auto max-w-prose mt-20">{children}</div>
        </section>

        <footer>
          <NewsletterForm />
          {morePosts && <ReadMore posts={morePosts} />}
          <ToTopButton />
        </footer>
      </main>
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
        ? [
            ...paths,
            { params: { id: "site-demo-post" } },
            { params: { id: "test" } },
          ]
        : paths,
    fallback: false,
  };
}

type Params = { params: { id: string } };

export async function getStaticProps({ params }: Params) {
  const post = posts
    // .filter(byOnlyPublished)
    .find((post: Post) => post.slug === params.id);
  const otherPosts = extractAndSortMetadata(posts).filter(
    (post) => post.slug !== params.id
  );

  const morePosts = getRandom(otherPosts, 3);

  return { props: { post, morePosts } };
}

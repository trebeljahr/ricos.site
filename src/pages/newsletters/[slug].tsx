import PostBody from "../../components/post-body";
import Layout from "../../components/layout";
import { getAllNewsletters, getNewsletterBySlug } from "../../lib/api";
import { ToTopButton } from "../../components/ToTopButton";
import { Post as PostType } from "../../@types/post";
import Image from "next/image";
import { NewsletterForm } from "../../components/newsletter-signup";
import Link from "next/link";
import PostHeader from "../../components/post-header";

type Props = {
  newsletter: PostType;
  slug: string;
  nextPost: null | number;
  prevPost: null | number;
};

const NextAndPrevArrows = ({
  nextPost,
  prevPost,
}: {
  nextPost: null | number;
  prevPost: null | number;
}) => {
  return (
    <>
      {prevPost && (
        <Link href={`/newsletters/${prevPost}`}>
          <a className="page-arrow left">
            <span className="icon-arrow-left" />
          </a>
        </Link>
      )}
      {nextPost && (
        <Link href={`/newsletters/${nextPost}`}>
          <a className="page-arrow right">
            <span className="icon-arrow-right" />
          </a>
        </Link>
      )}
    </>
  );
};

const Newsletter = ({ newsletter, slug, nextPost, prevPost }: Props) => {
  return (
    <Layout description={newsletter.excerpt} title={`Live and Learn #${slug}`}>
      <article className="newsletter-article">
        <section className="post-body main-section">
          <PostHeader title={newsletter.title + " – Live and Learn #" + slug} />
          <div className="header-image-container">
            <Image
              priority
              src={newsletter.cover.src}
              layout="responsive"
              width={newsletter.cover.width || 1}
              height={newsletter.cover.height || 1}
              objectFit="cover"
              alt={newsletter.cover.alt}
            />
          </div>
          <PostBody content={newsletter.content} excerpt={newsletter.excerpt} />
        </section>

        <section className="main-section">
          <NextAndPrevArrows nextPost={nextPost} prevPost={prevPost} />
          <NewsletterForm />
          <ToTopButton />
        </section>
      </article>
    </Layout>
  );
};

export default Newsletter;

type Params = {
  params: {
    slug: string;
    nextPost: null | number;
    prevPost: null | number;
  };
};

export async function getStaticProps({ params: { slug } }: Params) {
  const newsletter = await getNewsletterBySlug(slug + ".md", [
    "content",
    "title",
    "cover",
    "excerpt",
  ]);

  const allNewsletters = await getAllNewsletters(["slug"]);
  const newsletterNumber = parseInt(slug);

  let nextPost: number | null = newsletterNumber + 1;
  let prevPost: number | null = newsletterNumber - 1;

  nextPost = nextPost > allNewsletters.length ? null : nextPost;
  prevPost = prevPost < 1 ? null : prevPost;

  return {
    props: {
      newsletter,
      slug: slug,
      nextPost,
      prevPost,
    },
  };
}

export async function getStaticPaths() {
  const allNewsletters = await getAllNewsletters(["slug"]);

  return {
    paths: allNewsletters.map((newsletter) => ({
      params: {
        slug: newsletter.slug,
      },
    })),
    fallback: false,
  };
}

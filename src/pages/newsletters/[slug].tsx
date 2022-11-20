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
  console.log(
    "aspect ratio: ",
    newsletter.cover.width || 1,
    newsletter.cover.height || 1
  );
  return (
    <Layout description={newsletter.excerpt} title={`Newsletter ${slug}`}>
      <article className="newsletter-article">
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
        <section className="post-body main-section">
          <PostBody content={newsletter.content} />
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
  ]);

  const allNewsletters = await getAllNewsletters(["slug"]);
  const newsletterNumber = parseInt(slug);

  let nextPost: number | null = newsletterNumber + 1;
  let prevPost: number | null = newsletterNumber - 1;

  console.log(nextPost, prevPost);

  nextPost = nextPost > allNewsletters.length ? null : nextPost;
  prevPost = prevPost < 1 ? null : prevPost;
  console.log(nextPost, prevPost);

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
    paths: allNewsletters.map((newsletter) => {
      const params = {
        slug: newsletter.slug,
      };

      console.log(params);
      return {
        params,
      };
    }),
    fallback: false,
  };
}

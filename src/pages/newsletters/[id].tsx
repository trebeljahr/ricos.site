import { allNewsletters, Newsletter } from "contentlayer/generated";
import Image from "next/image";
import Link from "next/link";
import Layout from "../../components/layout";
import { NewsletterForm } from "../../components/newsletter-signup";
import { PostBodyWithoutExcerpt } from "../../components/post-body";
import PostHeader from "../../components/post-header";
import { ToTopButton } from "../../components/ToTopButton";

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
        <Link
          href={`/newsletters/${prevPost}`}
          className="page-arrow left"
          passHref
        >
          <span className="icon-arrow-left" />
        </Link>
      )}
      {nextPost && (
        <Link
          href={`/newsletters/${nextPost}`}
          className="page-arrow right"
          passHref
        >
          <span className="icon-arrow-right" />
        </Link>
      )}
    </>
  );
};

type Props = {
  newsletter: Newsletter;
  nextPost: null | number;
  prevPost: null | number;
};

const Newsletter = ({
  newsletter: { excerpt, title, newsletterNumber, cover, body },
  nextPost,
  prevPost,
}: Props) => {
  const fullTitle = title + " – Live and Learn #" + newsletterNumber;
  return (
    <Layout
      title={fullTitle}
      description={excerpt || ""}
      url={`https://trebeljahr.com/newsletters/${newsletterNumber}`}
      image={"https://trebeljahr.com" + cover.src}
    >
      <article className="newsletter-article">
        <section className="post-body main-section">
          <PostHeader title={fullTitle} />
          {excerpt && <p>{excerpt}</p>}
          <div className="header-image-container">
            <Image
              priority
              src={cover.src}
              width={cover.width || 1}
              height={cover.height || 1}
              alt={cover.alt}
              sizes="100vw"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "cover",
              }}
            />
          </div>
          <PostBodyWithoutExcerpt content={body.raw} />
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
    id: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const newsletter = allNewsletters.find(({ id }) => id === params.id);
  if (!newsletter) throw Error("Newsletter not found");

  let nextPost: number | null = newsletter.newsletterNumber + 1;
  let prevPost: number | null = newsletter.newsletterNumber - 1;

  nextPost = nextPost > allNewsletters.length ? null : nextPost;
  prevPost = prevPost < 1 ? null : prevPost;

  return {
    props: {
      newsletter,
      nextPost,
      prevPost,
    },
  };
}

export async function getStaticPaths() {
  return {
    paths: allNewsletters.map(({ id }) => ({
      params: {
        id,
      },
    })),
    fallback: false,
  };
}

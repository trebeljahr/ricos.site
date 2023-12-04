import {
  allNewsletters,
  type Newsletter as NewsletterType,
} from "@contentlayer/generated";
import Image from "next/image";
import Link from "next/link";
import { BreadCrumbs } from "src/components/BreadCrumbs";
import { ShowAfterScrolling } from "src/components/ShowAfterScrolling";
import Layout from "../../components/layout";
import {
  NewsletterForm,
  NewsletterModalPopup,
} from "../../components/newsletter-signup";
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
    <ShowAfterScrolling>
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
    </ShowAfterScrolling>
  );
};

type Props = {
  newsletter: NewsletterType;
  nextPost: null | number;
  prevPost: null | number;
};

const Newsletter = ({
  newsletter: { excerpt, title, number, slugTitle, cover, body },
  nextPost,
  prevPost,
}: Props) => {
  const fullTitle = title + " – Live and Learn #" + number;
  const url = `newsletters/${slugTitle}`;

  return (
    <Layout
      title={fullTitle}
      description={excerpt || ""}
      url={url}
      image={cover.src}
      imageAlt={cover.alt}
    >
      <NewsletterModalPopup />

      <article className="newsletter-article">
        <section className="post-body main-section mt-2">
          <BreadCrumbs
            path={url}
            overwrites={[{ matchingPath: slugTitle, newText: `${number}` }]}
          />

          <PostHeader title={fullTitle} />
          {excerpt && <p>{excerpt}</p>}
          <div className="header-image-container mb-5">
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
  const newsletter = allNewsletters.find(
    ({ slugTitle }) => slugTitle === params.id
  );
  if (!newsletter) throw Error("Newsletter not found");

  const next = newsletter.number + 1;
  const prev = newsletter.number - 1;

  let nextPost = allNewsletters.find(({ number }) => number === next);
  let prevPost = allNewsletters.find(({ number }) => number === prev);

  return {
    props: {
      newsletter,
      nextPost: nextPost?.slugTitle || null,
      prevPost: prevPost?.slugTitle || null,
    },
  };
}

export async function getStaticPaths() {
  const newsletterTitles = allNewsletters.map(({ slugTitle }) => {
    return {
      params: {
        id: slugTitle,
      },
    };
  });

  // const newsletterIds = allNewsletters.map(({ id }) => {
  //   return {
  //     params: {
  //       id,
  //     },
  //   };
  // });

  return {
    paths: newsletterTitles, //...newsletterIds],
    fallback: false,
  };
}

import {
  allNewsletters,
  type Newsletter as NewsletterType,
} from "@contentlayer/generated";
import Image from "next/image";
import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import {
  NewsletterForm,
  NewsletterModalPopup,
} from "@components/NewsletterSignup";
import { PostBodyWithoutExcerpt } from "@components/PostBody";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import { NextAndPrevArrows } from "@components/NextAndPrevArrows";
type Props = {
  newsletter: NewsletterType;
  nextPost: null | number;
  prevPost: null | number;
};

const Newsletter = ({
  newsletter: { excerpt, title, number, slugTitle, cover, body, date },
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

      <BreadCrumbs
        path={url}
        overwrites={[{ matchingPath: slugTitle, newText: `${number}` }]}
      />

      <main>
        <article className="maint-text newsletter-article">
          <Header title={fullTitle} date={date} />
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
        </article>
      </main>

      <footer>
        <NextAndPrevArrows nextPost={nextPost} prevPost={prevPost} />
        <NewsletterForm />
        <ToTopButton />
      </footer>
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

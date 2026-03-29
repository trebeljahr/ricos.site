import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { NextAndPrevArrows } from "@components/NextAndPrevArrows";
import { PostBodyWithoutExcerpt } from "@components/PostBody";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import type { Newsletter as NewsletterType } from "@velite";
import { byOnlyPublished } from "src/lib/utils/filters";

type Props = {
  newsletter: NewsletterType;
  nextPost: null | number;
  prevPost: null | number;
};

const Newsletter = ({
  newsletter: {
    excerpt,
    excludeExcerpt,
    title,
    number,
    slugTitle,
    content,
    tags,
    cover,
    date,
    metaDescription,
    seoTitle,
    seoKeywords,
    seoOgImage,
    seoOgImageAlt,
    metadata: { readingTime },
  },
  nextPost,
  prevPost,
}: Props) => {
  const newsletterTag = "Live and Learn #" + number;
  const fullTitle = seoTitle || title;
  const url = `newsletters/${slugTitle}`;

  return (
    <Layout
      title={fullTitle}
      description={metaDescription}
      url={url}
      keywords={seoKeywords.length > 0 ? seoKeywords : tags.split(",")}
      image={seoOgImage || cover.src}
      imageAlt={seoOgImageAlt || cover.alt}
      withProgressBar={true}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs
          path={url}
          overwrites={[{ matchingPath: slugTitle, newText: `${number}` }]}
        />
        <MetadataDisplay date={date} readingTime={readingTime} />

        <article>
          <Header title={fullTitle} />
          <div className="mb-5">
            <ImageWithLoader
              priority
              src={cover.src}
              width={768}
              height={768}
              alt={cover.alt}
              sizes="100vw"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "cover",
              }}
            />
          </div>

          <div className="mx-auto max-w-prose mt-8">
            {excerpt && !excludeExcerpt && <p>{excerpt}</p>}

            <PostBodyWithoutExcerpt content={content} />
            <NewsletterForm />
          </div>
        </article>

        <footer>
          <NextAndPrevArrows nextPost={nextPost} prevPost={prevPost} />
          <ToTopButton />
        </footer>
      </main>
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
  const rawNewsletters = require("../../../.velite/newsletters.json");
  const newsletters = (rawNewsletters.default || rawNewsletters) as NewsletterType[];
  const newsletter = newsletters.find(
    ({ slugTitle }) => slugTitle === params.id,
  );
  if (!newsletter) throw Error("Newsletter not found");

  const number = parseInt(String(newsletter.number));
  const next = number + 1;
  const prev = number - 1;

  let nextPost = newsletters.find((nl) => parseInt(String(nl.number)) === next);
  let prevPost = newsletters.find((nl) => parseInt(String(nl.number)) === prev);

  return {
    props: {
      newsletter,
      nextPost: nextPost?.slugTitle || null,
      prevPost: prevPost?.slugTitle || null,
    },
  };
}

export async function getStaticPaths() {
  const newsletters: NewsletterType[] = require("../../../.velite/newsletters.json");
  const newsletterTitles = newsletters
    .filter(byOnlyPublished)
    .map(({ slugTitle }) => {
      return {
        params: {
          id: slugTitle,
        },
      };
    });

  return {
    paths: newsletterTitles,
    fallback: false,
  };
}

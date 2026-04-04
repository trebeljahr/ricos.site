import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import { JsonLd, BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { NextAndPrevArrows } from "@components/NextAndPrevArrows";
import { PostBodyWithoutExcerpt } from "@components/PostBody";
import Header from "@components/PostHeader";
import { Backlinks } from "@components/Backlinks";
import { RelatedContent } from "@components/RelatedContent";
import { ToTopButton } from "@components/ToTopButton";
import type { Newsletter as NewsletterType } from "@velite";

import { byOnlyPublished } from "src/lib/utils/filters";

type RelatedItem = { title: string; link: string; excerpt?: string };

type BacklinkItem = { title: string; link: string; type: string };

type Props = {
  newsletter: NewsletterType;
  nextPost: null | number;
  prevPost: null | number;
  relatedNewsletters: RelatedItem[];
  backlinks: BacklinkItem[];
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
  relatedNewsletters,
  backlinks,
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
      ogType="article"
      articlePublishedTime={date}
    >
      <JsonLd
        title={fullTitle}
        description={metaDescription}
        url={url}
        image={seoOgImage || cover.src}
        imageAlt={seoOgImageAlt || cover.alt}
        datePublished={date}
        type="article"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Newsletters", url: "/newsletters" },
          { name: `#${number}`, url: `/${url}` },
        ]}
      />
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

        <footer className="mx-auto max-w-prose">
          <Backlinks items={backlinks} />
          <RelatedContent items={relatedNewsletters} heading="More from Live and Learn" />
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
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const { getRelatedContent } = await import("src/lib/utils/getRelatedContent");
  const rawNewsletters = loadVeliteData("newsletters.json");
  const newsletters = (rawNewsletters.default || rawNewsletters) as NewsletterType[];
  const published = newsletters.filter(byOnlyPublished);
  const newsletter = newsletters.find(
    ({ slugTitle }) => slugTitle === params.id,
  );
  if (!newsletter) throw Error("Newsletter not found");

  const number = parseInt(String(newsletter.number));
  const next = number + 1;
  const prev = number - 1;

  let nextPost = newsletters.find((nl) => parseInt(String(nl.number)) === next);
  let prevPost = newsletters.find((nl) => parseInt(String(nl.number)) === prev);

  const relatedNewsletters = getRelatedContent(newsletter, published, 3).map(
    (nl: NewsletterType) => ({
      title: nl.title,
      link: nl.link,
      excerpt: nl.excerpt?.slice(0, 120) + "...",
    })
  );

  const { getBacklinks } = await import("src/lib/utils/getBacklinks");
  const backlinks = getBacklinks(newsletter.link);

  return {
    props: {
      newsletter,
      nextPost: nextPost?.slugTitle || null,
      prevPost: prevPost?.slugTitle || null,
      relatedNewsletters,
      backlinks,
    },
  };
}

export async function getStaticPaths() {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const newsletters: NewsletterType[] = loadVeliteData("newsletters.json");
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

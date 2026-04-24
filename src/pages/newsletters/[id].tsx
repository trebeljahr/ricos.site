import { Backlinks } from "@components/Backlinks";
import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import { BreadcrumbJsonLd, JsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { NextAndPrevArrows } from "@components/NextAndPrevArrows";
import { HorizontalCard } from "@components/NiceCards";
import { PostBodyWithoutExcerpt } from "@components/PostBody";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import type { Newsletter as NewsletterType } from "@velite";
import type { CommonMetadata } from "src/@types";

import { byOnlyPublished } from "src/lib/utils/filters";

type BacklinkItem = { title: string; link: string; type: string };

type Props = {
  newsletter: NewsletterType;
  nextPost: null | number;
  prevPost: null | number;
  relatedNewsletters: CommonMetadata[];
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
        <BreadCrumbs path={url} overwrites={[{ matchingPath: slugTitle, newText: `${number}` }]} />
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
          </div>
        </article>

        <footer className="mx-auto max-w-prose">
          <NewsletterForm />
          {relatedNewsletters.length > 0 && (
            <div className="mt-10">
              <h2>More from Live and Learn</h2>
              {relatedNewsletters.map((nl) => (
                <HorizontalCard
                  key={nl.slug}
                  cover={nl.cover}
                  link={nl.link}
                  title={nl.title}
                  excerpt={nl.excerpt}
                  date={nl.date}
                  readingTime={nl.metadata?.readingTime}
                />
              ))}
            </div>
          )}
          <NextAndPrevArrows nextPost={nextPost} prevPost={prevPost} />
          <Backlinks items={backlinks} />
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
  const newsletter = newsletters.find(({ slugTitle }) => slugTitle === params.id);
  if (!newsletter) throw Error("Newsletter not found");

  const number = Number.parseInt(String(newsletter.number));
  const next = number + 1;
  const prev = number - 1;

  const nextPost = newsletters.find((nl) => Number.parseInt(String(nl.number)) === next);
  const prevPost = newsletters.find((nl) => Number.parseInt(String(nl.number)) === prev);

  const { toOnlyMetadata } = await import("src/lib/utils/toOnlyMetadata");
  const relatedNewsletters = getRelatedContent(newsletter, published, 3).map((nl: NewsletterType) =>
    toOnlyMetadata(nl),
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
  const newsletterTitles = newsletters.filter(byOnlyPublished).map(({ slugTitle }) => {
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

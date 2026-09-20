import { Backlinks } from "@components/Backlinks";
import { Card } from "@components/Card";
import { BookCover } from "@components/CoverImage";
import { TrophyEgg } from "@components/EasterEggs/Trophy";
import { ExternalLink } from "@components/ExternalLink";
import { BreadcrumbJsonLd, JsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { PageMain, PageTop } from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import type { Booknote } from "@velite";
import { ogImageDimensions } from "src/lib/ogImage";
import { byOnlyPublished } from "src/lib/utils/filters";
import { pickProps } from "src/lib/utils/pickProps";
import type { CardMetadata } from "src/lib/utils/toOnlyMetadata";

type BacklinkItem = { title: string; link: string; type: string };

// Fields this page renders. Everything else on the entry (link, excerpt,
// markdownExcerpt, detailedNotes, amazonAffiliateLink, contentType, published,
// date-last-updated, hasDemos) stays out of __NEXT_DATA__.
const BOOKNOTE_FIELDS = [
  "slug",
  "title",
  "subtitle",
  "bookAuthor",
  "rating",
  "goodreadsLink",
  "summary",
  "date",
  "cover",
  "tags",
  "metadata",
  "metaDescription",
  "seoTitle",
  "seoKeywords",
  "seoOgImage",
  "seoOgImageAlt",
  "hasMath",
  "content",
] as const;

type Props = {
  booknote: Booknote;
  relatedBooks: CardMetadata[];
  backlinks: BacklinkItem[];
};

const BooknoteComponent = ({ booknote }: Props) => {
  return <MDXContent source={booknote.content} />;
};

const BooknotesWithDefault = ({ booknote }: Props) => {
  if (!booknote?.content) {
    return (
      <div>
        <p className="placeholder-text">
          I have read this book, but did not write booknotes or a summary for it yet. For now, this
          is all there is.
        </p>
      </div>
    );
  }

  return <BooknoteComponent booknote={booknote} />;
};

const Book = ({ booknote, relatedBooks, backlinks }: Props) => {
  const url = `booknotes/${booknote.slug}`;
  const ogImage = booknote.seoOgImage || booknote.cover.src;
  return (
    <Layout
      title={booknote.seoTitle || `Rico's booknotes for ${booknote.title}`}
      description={booknote.metaDescription}
      url={url}
      keywords={booknote.seoKeywords.length > 0 ? booknote.seoKeywords : booknote.tags.split(",")}
      image={ogImage}
      imageAlt={booknote.seoOgImageAlt || booknote.cover.alt}
      {...ogImageDimensions(booknote.cover, ogImage)}
      withProgressBar={true}
      ogType="article"
      articlePublishedTime={booknote.date}
      hasMath={booknote.hasMath}
      noindex={!booknote.summary}
    >
      <JsonLd
        title={booknote.seoTitle || booknote.title}
        description={booknote.metaDescription}
        url={url}
        image={booknote.seoOgImage || booknote.cover.src}
        imageAlt={booknote.seoOgImageAlt || booknote.cover.alt}
        datePublished={booknote.date}
        type="book"
        bookAuthor={booknote.bookAuthor}
        bookRating={booknote.rating}
        bookUrl={booknote.goodreadsLink}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Book Notes", url: "/booknotes" },
          { name: booknote.title, url: `/${url}` },
        ]}
      />
      <PageMain>
        <article>
          <PageTop breadcrumbs={{ path: url }}>
            <MetadataDisplay readingTime={booknote.metadata.readingTime} date={booknote.date} />
            <section className="flex gap-block">
              <div className="not-prose block relative mb-block md:mb-0 w-60 overflow-hidden rounded-md">
                <BookCover title={booknote.title} cover={booknote.cover} priority={true} />
              </div>
              <header className="h-fit w-full">
                <hgroup className="post-header">
                  <h1>{booknote.title}</h1>
                  <p>{booknote.subtitle}</p>
                  <p>by {booknote.bookAuthor}</p>
                </hgroup>
                {/* The rating and the Goodreads link are a second block, not
                    more lines of the title, so they sit a group step below it. */}
                <div className="post-header mt-group">
                  <p className="relative">
                    <TrophyEgg rating={booknote.rating} /> Rated: {booknote.rating}/10
                  </p>
                  {booknote.goodreadsLink && (
                    <ExternalLink href={booknote.goodreadsLink}>View on Goodreads</ExternalLink>
                  )}
                </div>
              </header>
            </section>
          </PageTop>
          <section>
            <BooknotesWithDefault booknote={booknote} />
          </section>
        </article>

        <footer className="mt-section">
          <NewsletterForm />
          {relatedBooks.length > 0 && (
            <div className="mt-sub">
              <h2>More book notes</h2>
              {relatedBooks.map((book) => (
                <Card
                  layout="horizontal"
                  key={book.slug}
                  cover={book.cover}
                  link={book.link}
                  title={book.title}
                  subtitle={book.subtitle}
                  excerpt={book.excerpt}
                  date={book.date}
                  readingTime={book.metadata?.readingTime}
                />
              ))}
            </div>
          )}
          <Backlinks items={backlinks} />
          <ToTopButton />
        </footer>
      </PageMain>
    </Layout>
  );
};

export default Book;

type Params = {
  params: {
    id: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const { getRelatedContent } = await import("src/lib/utils/getRelatedContent");
  const booknotes = loadVeliteData("booknotes.json");
  const published = booknotes.filter(byOnlyPublished);
  const booknote = published.find(({ slug }: Booknote) => params.id === slug);
  if (!booknote) return { notFound: true } as const;

  const { toCardMetadata } = await import("src/lib/utils/toOnlyMetadata");
  const withContent = published.filter((b: Booknote) => b.summary);
  const relatedBooks = getRelatedContent(booknote, withContent, 4).map((b: Booknote) =>
    toCardMetadata(b),
  );

  const { getBacklinks } = await import("src/lib/utils/getBacklinks");
  const backlinks = getBacklinks(booknote.link);

  return {
    props: {
      booknote: pickProps(booknote, BOOKNOTE_FIELDS),
      relatedBooks,
      backlinks,
    },
  };
}

export async function getStaticPaths() {
  const { loadVeliteData, veliteFallback } = await import("src/lib/loadVeliteData");
  const booknotes = loadVeliteData("booknotes.json");
  if (!Array.isArray(booknotes) || booknotes.length === 0) {
    throw new Error(
      "booknotes.json is empty in getStaticPaths — velite likely did not run or the content submodule is missing. Refusing to build with zero booknote pages.",
    );
  }
  const paths = booknotes.filter(byOnlyPublished).map((book: Booknote) => {
    return {
      params: {
        id: book.slug,
      },
    };
  });
  if (paths.length === 0) {
    throw new Error(
      `No published booknotes found for getStaticPaths (loaded ${booknotes.length} raw entries). Refusing to build with zero booknote pages.`,
    );
  }

  return {
    paths,
    fallback: veliteFallback,
  };
}

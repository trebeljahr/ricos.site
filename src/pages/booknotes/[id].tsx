import { BreadCrumbs } from "@components/BreadCrumbs";
import { BookCover } from "@components/CoverImage";
import { ExternalLink } from "@components/ExternalLink";
import { JsonLd, BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { Backlinks } from "@components/Backlinks";
import { HorizontalCard } from "@components/NiceCards";
import { ToTopButton } from "@components/ToTopButton";
import type { Booknote } from "@velite";
import { CommonMetadata } from "src/@types";

import { byOnlyPublished } from "src/lib/utils/filters";

type BacklinkItem = { title: string; link: string; type: string };

type Props = {
  booknote: Booknote;
  relatedBooks: CommonMetadata[];
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
          I have read this book, but did not write booknotes or a summary for it
          yet. For now, this is all there is.
        </p>
      </div>
    );
  }

  return <BooknoteComponent booknote={booknote} />;
};

const Book = ({ booknote, relatedBooks, backlinks }: Props) => {
  const url = `booknotes/${booknote.slug}`;
  return (
    <Layout
      title={booknote.seoTitle || `Rico's booknotes for ${booknote.title}`}
      description={booknote.metaDescription}
      url={url}
      keywords={booknote.seoKeywords.length > 0 ? booknote.seoKeywords : booknote.tags.split(",")}
      image={booknote.seoOgImage || booknote.cover.src}
      imageAlt={booknote.seoOgImageAlt || booknote.cover.alt}
      withProgressBar={true}
      ogType="article"
      articlePublishedTime={booknote.date}
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
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Book Notes", url: "/booknotes" },
          { name: booknote.title, url: `/${url}` },
        ]}
      />
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={url} />
        <MetadataDisplay
          readingTime={booknote.metadata.readingTime}
          date={booknote.date}
        />
        <article>
          <section className="flex mt-16!">
            <div className="not-prose block relative mr-2 mb-5 md:mb-0 w-60 overflow-hidden rounded-md">
              <BookCover
                title={booknote.title}
                cover={booknote.cover}
                priority={true}
              />
            </div>
            <header className="h-fit w-full ml-5">
              <hgroup>
                <h1 className="my-2!">{booknote.title}</h1>
                <p className="mt-2! mb-0!">{booknote.subtitle}</p>
                <p className="mt-0! mb-2!">by {booknote.bookAuthor}</p>
                <p className="mt-12! mb-2!">🏆 Rated: {booknote.rating}/10</p>
                {booknote.goodreadsLink && (
                  <ExternalLink href={booknote.goodreadsLink}>
                    View on Goodreads
                  </ExternalLink>
                )}
              </hgroup>
            </header>
          </section>
          <section>
            <BooknotesWithDefault booknote={booknote} />
          </section>
        </article>

        <footer>
          <NewsletterForm />
          {relatedBooks.length > 0 && (
            <div className="mt-10">
              <h2>More book notes</h2>
              {relatedBooks.map((book) => (
                <HorizontalCard
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
      </main>
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

  const { toOnlyMetadata } = await import("src/lib/utils/toOnlyMetadata");
  const withContent = published.filter((b: Booknote) => b.summary);
  const relatedBooks = getRelatedContent(booknote, withContent, 4).map(
    (b: Booknote) => toOnlyMetadata(b)
  );

  const { getBacklinks } = await import("src/lib/utils/getBacklinks");
  const backlinks = getBacklinks(booknote.link);

  return {
    props: {
      booknote,
      relatedBooks,
      backlinks,
    },
  };
}

export async function getStaticPaths() {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const booknotes = loadVeliteData("booknotes.json");
  const paths = booknotes.filter(byOnlyPublished).map((book: Booknote) => {
    return {
      params: {
        id: book.slug,
      },
    };
  });

  return {
    paths,
    fallback: false,
  };
}

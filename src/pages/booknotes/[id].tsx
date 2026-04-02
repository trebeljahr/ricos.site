import { BreadCrumbs } from "@components/BreadCrumbs";
import { BookCover } from "@components/CoverImage";
import { ExternalLink } from "@components/ExternalLink";
import { JsonLd, BreadcrumbJsonLd } from "@components/JsonLd";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { MetadataDisplay } from "@components/MetadataDisplay";
import { NewsletterForm } from "@components/NewsletterForm";
import { RelatedContent } from "@components/RelatedContent";
import { ToTopButton } from "@components/ToTopButton";
import type { Booknote } from "@velite";

import { byOnlyPublished } from "src/lib/utils/filters";

type RelatedItem = { title: string; link: string; excerpt?: string };

type Props = {
  booknote: Booknote;
  relatedBooks: RelatedItem[];
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

const Book = ({ booknote, relatedBooks }: Props) => {
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
          <RelatedContent items={relatedBooks} heading="More book notes" />
          <NewsletterForm />
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

  const relatedBooks = getRelatedContent(booknote, published, 4).map(
    (b: Booknote) => ({
      title: `${b.title} by ${b.bookAuthor}`,
      link: b.link,
      excerpt: b.excerpt?.slice(0, 120) + "...",
    })
  );

  return {
    props: {
      booknote,
      relatedBooks,
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

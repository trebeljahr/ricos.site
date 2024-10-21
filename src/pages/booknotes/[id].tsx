import { BreadCrumbs } from "@components/BreadCrumbs";
import { BookCover } from "@components/CoverImage";
import { ExternalLink } from "@components/ExternalLink";
import Layout from "@components/Layout";
import { MDXContent } from "@components/MDXContent";
import { NewsletterForm } from "@components/NewsletterSignup";
import { ToTopButton } from "@components/ToTopButton";
import { Booknote, booknotes } from "@velite";
import { byOnlyPublished } from "src/lib/utils";
type Props = {
  booknote: Booknote;
};

const BuyItOnAmazon = ({ link }: { link: string }) => {
  if (!link) {
    return null;
  }

  return (
    <ExternalLink className="amazonLink" href={link}>
      Buy it on Amazon
    </ExternalLink>
  );
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

const Book = ({ booknote }: Props) => {
  const defaultDescription = `These are the book Notes for ${booknote.title} by ${booknote.bookAuthor}`;
  return (
    <Layout
      title={booknote.title}
      description={booknote.excerpt || defaultDescription}
      url={`booknotes/${booknote.slug}`}
    >
      <BreadCrumbs path={`booknotes/${booknote.slug}`} />
      <main>
        <article>
          <section className="flex">
            <div className="not-prose block relative mb-5 md:mb-0 w-60 overflow-hidden rounded-md">
              <BookCover
                title={booknote.title}
                src={booknote.cover.src}
                alt={booknote.cover.alt}
                priority={true}
              />
            </div>
            <header className="book-preview-text">
              <hgroup>
                <h1 className="my-0">{booknote.title}</h1>
                <p className="my-0">{booknote.subtitle}</p>
                <p> by {booknote.bookAuthor}</p>
                <p>
                  <b>Rating: {booknote.rating}/10</b>
                </p>
                <BuyItOnAmazon link={booknote.amazonLink} />
              </hgroup>
            </header>
          </section>
          <section>
            <BooknotesWithDefault booknote={booknote} />
            <BuyItOnAmazon link={booknote.amazonLink} />
          </section>
        </article>
      </main>

      <footer>
        <ToTopButton />
        <NewsletterForm />
      </footer>
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
  const booknote = booknotes
    .filter(byOnlyPublished)
    .find(({ slug }) => params.id === slug);

  return {
    props: {
      booknote,
    },
  };
}

export async function getStaticPaths() {
  const paths = booknotes.filter(byOnlyPublished).map((book) => {
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

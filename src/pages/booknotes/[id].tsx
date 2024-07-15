import { BreadCrumbs } from "@components/BreadCrumbs";
import { BookCover } from "@components/CoverImage";
import { MarkdownRenderers } from "@components/CustomRenderers";
import { ExternalLink } from "@components/ExternalLink";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import { ToTopButton } from "@components/ToTopButton";
import { Booknote, allBooknotes } from "@contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";

type Props = {
  book: Booknote;
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

const BooknoteComponent = ({ book }: Props) => {
  const Component = useMDXComponent(book.body.code);
  return <Component components={{ ...MarkdownRenderers }} />;
};

const BooknotesWithDefault = ({ book }: Props) => {
  if (!book?.body?.code) {
    return (
      <div>
        <p className="placeholder-text">
          I have read this book, but did not write booknotes or a summary for it
          yet. For now, this is all there is.
        </p>
      </div>
    );
  }

  return <BooknoteComponent book={book} />;
};

const Book = ({ book }: Props) => {
  const defaultDescription = `These are the book Notes for ${book.title} by ${book.bookAuthor}`;
  return (
    <Layout
      title={book.title}
      description={book.excerpt || defaultDescription}
      url={`booknotes/${book.id}`}
    >
      <article className="prose">
        <BreadCrumbs path={`booknotes/${book.id}`} />
        <section className="flex not-prose">
          <div className="block relative mb-5 md:mb-0 w-60 overflow-hidden rounded-md">
            <BookCover
              title={book.title}
              src={book.bookCover}
              priority={true}
            />
          </div>
          <div className="book-preview-text">
            <h1>{book.title}</h1>
            <p>{book.subtitle}</p>
            <p> by {book.bookAuthor}</p>
            <p>
              <b>Rating: {book.rating}/10</b>
            </p>
            <BuyItOnAmazon link={book.amazonLink} />
          </div>
        </section>
        <section className="post-body">
          <BooknotesWithDefault book={book} />
          <BuyItOnAmazon link={book.amazonLink} />
        </section>
        <section>
          <ToTopButton />
          <NewsletterForm />
        </section>
      </article>
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
  const book = allBooknotes.find(({ id }) => params.id === id);

  return {
    props: {
      book,
    },
  };
}

export async function getStaticPaths() {
  const paths = allBooknotes.map((book) => {
    return {
      params: {
        id: book.id,
      },
    };
  });

  return {
    paths,
    fallback: false,
  };
}

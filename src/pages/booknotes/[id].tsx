import { useRouter } from "next/router";
import ErrorPage from "next/error";
import Layout from "../../components/layout";
import { PostSubTitle, PostTitle } from "../../components/post-title";
import { BookCover } from "../../components/cover-image";
import { ToTopButton } from "../../components/ToTopButton";
import { ExternalLink } from "../../components/ExternalLink";
import { NewsletterForm } from "../../components/newsletter-signup";
import { Booknote, allBooknotes } from "contentlayer/generated";
import { useMDXComponent } from "next-contentlayer/hooks";
import { MarkdownRenderers } from "src/components/CustomRenderers";

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
      <div className="main-text">
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
    <Layout title={book.title} description={book.excerpt || defaultDescription}>
      <article>
        <section className="book-info main-section">
          <div className="book-cover-image">
            <BookCover title={book.title} src={book.bookCover} />
          </div>

          <div className="book-preview-text">
            <PostTitle>{book.title}</PostTitle>
            <PostSubTitle>{book.subtitle}</PostSubTitle>
            <p>by {book.bookAuthor} </p>
            <h3>Rating: {book.rating}/10</h3>
            <BuyItOnAmazon link={book.amazonLink} />
          </div>
        </section>
        <section className="main-section main-text post-body">
          <BooknotesWithDefault book={book} />
          <BuyItOnAmazon link={book.amazonLink} />
        </section>
        <section className="main-section">
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

import { useRouter } from "next/router";
import ErrorPage from "next/error";
import PostBody from "../../components/post-body";
import Layout from "../../components/layout";
import { getBookReviewBySlug, getAllBookReviews } from "../../lib/api";
import { PostSubTitle, PostTitle } from "../../components/post-title";
import BookType from "../../@types/book";
import { BookCover } from "../../components/cover-image";
import { UtteranceComments } from "../../components/comments";
import { ToTopButton } from "../../components/ToTopButton";
import { ExternalLink } from "../../components/ExternalLink";
import { NewsletterForm } from "../../components/newsletter-signup";

type Props = {
  book: BookType;
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

const BooknotesWithDefault = ({ book }: Props) => {
  if (book.content) return <PostBody content={book.content} />;
  return (
    <div className="main-text">
      <p className="placeholder-text">
        I have read this book, but did not write booknotes or a summary for it
        yet. For now, this is all there is.
      </p>
    </div>
  );
};

const Book = ({ book }: Props) => {
  const router = useRouter();
  if (!router.isFallback && !book?.slug) {
    return <ErrorPage statusCode={404} />;
  }
  return (
    <Layout
      title={book.title}
      description={`These are the book Notes for ${book.title} by ${book.bookAuthor}`}
    >
      {router.isFallback ? (
        <PostTitle>Loading…</PostTitle>
      ) : (
        <article>
          <section className="book-info">
            <BookCover title={book.title} src={book.bookCover} />

            <div className="book-preview-text">
              <PostTitle>{book.title}</PostTitle>
              <PostSubTitle>{book.subtitle}</PostSubTitle>
              <p>by {book.bookAuthor} </p>
              <h3>Rating: {book.rating}/10</h3>
              <BuyItOnAmazon link={book.amazonLink} />
            </div>
          </section>
          <section className="main-section">
            <BooknotesWithDefault book={book} />
            <BuyItOnAmazon link={book.amazonLink} />
          </section>
          <section className="main-section">
            <ToTopButton />
            <NewsletterForm />
            <UtteranceComments />
          </section>
        </article>
      )}
    </Layout>
  );
};

export default Book;

type Params = {
  params: {
    slug: string;
  };
};

export async function getStaticProps({ params }: Params) {
  const book = getBookReviewBySlug(params.slug, [
    "title",
    "slug",
    "subtitle",
    "bookAuthor",
    "bookCover",
    "rating",
    "done",
    "content",
    "amazonLink",
  ]);

  return {
    props: {
      book,
    },
  };
}

export async function getStaticPaths() {
  const books = getAllBookReviews(["slug", "done"]);
  return {
    paths: books
      // .filter(({ done }) => done)
      .map((book) => {
        return {
          params: {
            slug: book.slug,
          },
        };
      }),
    fallback: false,
  };
}

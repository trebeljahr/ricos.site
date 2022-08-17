import { useRouter } from "next/router";
import ErrorPage from "next/error";
import PostBody from "../../components/post-body";
import Layout from "../../components/layout";
import { getBookReviewBySlug, getAllBookReviews } from "../../lib/api";
import { PostTitle } from "../../components/post-title";
import BookType from "../../types/book";
import { BookCover } from "../../components/cover-image";
import { UtteranceComments } from "../../components/comments";
import { ToTopButton } from "../../components/ToTopButton";

type Props = {
  book: BookType;
};

const BuyItOnAmazon = ({ link }: { link: string }) => {
  return (
    <a
      className="externalLink amazonLink"
      target="_blank"
      rel="noopener noreferrer"
      href={link}
    >
      Buy it on Amazon
    </a>
  );
};

const Book = ({ book }: Props) => {
  const router = useRouter();
  if (!router.isFallback && !book?.slug) {
    return <ErrorPage statusCode={404} />;
  }
  return (
    <Layout pageTitle={book.title}>
      {router.isFallback ? (
        <PostTitle>Loading…</PostTitle>
      ) : (
        <article>
          <div className="book-info">
            <BookCover
              title={book.title}
              src={book.bookCover}
              amazonLink={book.amazonLink}
            />
            <div className="book-preview-text">
              <h1>{book.title}</h1>
              <h2>by {book.bookAuthor} </h2>
              <h3>Rating: {book.rating}/10</h3>
              <BuyItOnAmazon link={book.amazonLink} />
            </div>
          </div>

          <PostBody content={book.content} />
          <BuyItOnAmazon link={book.amazonLink} />

          <UtteranceComments />
          <ToTopButton />
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

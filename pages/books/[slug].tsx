import { useRouter } from "next/router";
import ErrorPage from "next/error";
import PostBody from "../../components/post-body";
import PostHeader from "../../components/post-header";
import Layout from "../../components/layout";
import { getBookReviewBySlug, getAllBookReviews } from "../../lib/api";
import { PostTitle } from "../../components/post-title";
import Head from "next/head";
import markdownToHtml from "../../lib/markdownToHtml";
import BookType from "../../types/book";
import CoverImage from "../../components/cover-image";

type Props = {
  book: BookType;
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
          <div className="book-cover-image">
            <CoverImage title={book.title} src={book.bookCover} />
          </div>
          <div className="book-preview-text">
            <h1>{book.title}</h1>
            <h2>by {book.bookAuthor}</h2>
            <h3>Rating: {book.rating}/10</h3>
          </div>
          <PostBody content={book.content} />
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
  ]);
  const content = await markdownToHtml(book.content || "");

  return {
    props: {
      book: {
        ...book,
        content,
      },
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

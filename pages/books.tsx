import Image from "next/image";
import { BookPreview } from "../components/book-preview";
import Layout from "../components/layout";
import PostHeader from "../components/post-header";
import { getAllBookReviews } from "../lib/api";
import Book from "../types/book";

type Props = {
  allBooks: Book[];
};
export default function Books({ allBooks }: Props) {
  return (
    <Layout fullPage={true} pageTitle="Book Notes">
      <article>
        <PostHeader title={"Books Read:"} />
        <div className="allBooks">
          {allBooks.map((book) => {
            return <BookPreview key={book.slug} book={book} />;
          })}
        </div>
      </article>
    </Layout>
  );
}

export const getStaticProps = async () => {
  const allBooks = getAllBookReviews([
    "title",
    "slug",
    "bookAuthor",
    "bookCover",
    "rating",
    "amazonLink",
  ]);

  return {
    props: { allBooks },
  };
};

import { BookPreview } from "../components/book-preview";
import Layout from "../components/layout";
import PostHeader from "../components/post-header";
import { getAllBookReviews } from "../lib/api";
import Book from "../types/book";
import { Search, useSearch } from "../components/SearchBar";

type Props = {
  allBooks: Book[];
};

const emptySearchFilters = {
  bookAuthor: "",
  title: "",
  // rating: 0,
  tags: [""],
  detailedNotes: false,
};

export default function Books({ allBooks }: Props) {
  const { byFilters, filters, setFilters } = useSearch(emptySearchFilters);
  const filteredBooks = allBooks.filter(byFilters);
  return (
    <Layout fullPage={true} pageTitle="Book Notes">
      <article>
        <Search filters={filters} setFilters={setFilters} />
        <PostHeader title={"Books Read:"} />
        <div className="allBooks">
          {filteredBooks.map((book) => {
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
    "done",
    "tags",
    "amazonLink",
    "detailedNotes",
  ]);

  return {
    props: { allBooks: allBooks.filter(({ done }) => done) },
  };
};

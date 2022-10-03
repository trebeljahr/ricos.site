import { BookPreview } from "../components/book-preview";
import Layout from "../components/layout";
import PostHeader from "../components/post-header";
import { getAllBookReviews } from "../lib/api";
import Book from "../@types/book";
import { Search, useSearch } from "../components/SearchBar";
import { NewsletterForm } from "../components/newsletter-signup";
import { ToTopButton } from "../components/ToTopButton";

type Props = {
  allBooks: Book[];
};

function toFilters({
  bookAuthor,
  title,
  rating,
  tags,
  summary,
  detailedNotes,
}: Book) {
  return { bookAuthor, title, rating, tags, summary, detailedNotes };
}

export default function Books({ allBooks }: Props) {
  const { byFilters, filters, setFilters } = useSearch(allBooks.map(toFilters));
  const filteredBooks = allBooks.filter(byFilters);

  return (
    <Layout fullPage={true} pageTitle="Book Notes">
      <article>
        <section className="main-section">
          <Search filters={filters} setFilters={setFilters} />
          <PostHeader title={`books:`} />
          <p>Amount: {filteredBooks.length}</p>
          {!filters.detailedNotes.value && !filters.summary.value ? (
            <p>
              Fair warning: Many of these books still do not have detailed notes
              or even summaries. I am still working on adding them, but it takes
              time. If you want to see only those with descriptions or summaries
              you can add a filter above!
            </p>
          ) : null}
        </section>
        <section className="allBooks">
          {filteredBooks.map((book) => {
            return <BookPreview key={book.slug} book={book} />;
          })}
        </section>
        <section className="main-section">
          <NewsletterForm />
          <ToTopButton />
        </section>
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
    "summary",
    "rating",
    "done",
    "tags",
    "amazonLink",
    "detailedNotes",
  ]);
  return {
    props: { allBooks }, // { allBooks: allBooks.filter(({ done }) => done) },
  };
};

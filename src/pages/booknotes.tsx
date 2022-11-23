import Layout from "../components/layout";
import { BookPreview } from "../components/book-preview";
import { Search, useSearch } from "../components/SearchBar";
import { NewsletterForm } from "../components/newsletter-signup";
import { ToTopButton } from "../components/ToTopButton";
import { Booknote, allBooknotes } from "contentlayer/generated";
import { useEffect } from "react";

function toFilters({
  bookAuthor,
  title,
  rating,
  tags,
  summary,
  detailedNotes,
}: Booknote) {
  return { bookAuthor, title, rating, tags, summary, detailedNotes };
}

export default function Books() {
  const { byFilters, filters, setFilters } = useSearch(
    allBooknotes.map(toFilters)
  );
  const filteredBooks = allBooknotes.filter(byFilters);
  useEffect(() => {
    setFilters((old) => {
      return { ...old, summary: { ...old.summary, active: true, value: true } };
    });
  }, [setFilters]);
  return (
    <Layout
      title="Booknotes - notes on the things I've read"
      description={
        "An overview of what I have read, with a filterable list of books and booknotes"
      }
    >
      <article>
        <section className="main-section">
          <Search filters={filters} setFilters={setFilters} />
          <h1>booknotes</h1>
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
        <section className="main-section allBooknotes">
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

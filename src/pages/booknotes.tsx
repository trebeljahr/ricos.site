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

type Props = {
  booknotes: Booknote[];
};

export default function Books({ booknotes }: Props) {
  const { byFilters, filters, setFilters } = useSearch(
    booknotes.map(toFilters)
  );
  const filteredBooks = booknotes.filter(byFilters);
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
      image="/assets/midjourney/a-bookshelf.jpg"
      url="booknotes"
      imageAlt={"a bookshelf filled with lots of books"}
    >
      <article>
        <section className="main-section">
          <Search filters={filters} setFilters={setFilters} />
          <h1>Booknotes</h1>
          <p>Amount: {filteredBooks.length}</p>
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

export function getStaticProps() {
  return {
    props: {
      booknotes: allBooknotes.map(
        ({
          bookAuthor,
          title,
          rating,
          tags,
          summary,
          detailedNotes,
          excerpt,
          slug,
          bookCover,
        }) => ({
          bookAuthor,
          bookCover,
          slug,
          title,
          rating,
          tags,
          summary,
          detailedNotes,
          excerpt: excerpt || "",
        })
      ),
    },
  };
}

import { Booknote, allBooknotes } from "@contentlayer/generated";
import { useEffect } from "react";
import { Search, useSearch } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import { BookPreview } from "@components/book-preview";
import Layout from "@components/layout";
import { NewsletterForm } from "@components/newsletter-signup";

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
      <article className="main-content allBooknotes pt-5">
        <section>
          <h1>Booknotes</h1>
          <Search filters={filters} setFilters={setFilters} />
          <p className="mb-0">Amount: {filteredBooks.length}</p>
        </section>
        <section>
          {filteredBooks.map((book, index) => {
            return <BookPreview key={book.slug} book={book} index={index} />;
          })}
        </section>
        <section>
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

import { Booknote, booknotes } from "@velite";
import { useEffect } from "react";
import { Search, useSearch } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import { BookPreview } from "@components/BookPreview";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import Header from "@components/PostHeader";
import { byOnlyPublished } from "src/lib/utils";
import { BreadCrumbs } from "@components/BreadCrumbs";
function toFilters({
  bookAuthor,
  title,
  rating,
  tags,
  summary,
  detailedNotes,
}: Booknote) {
  return { bookAuthor, title, rating, tags };
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
      return { ...old };
    });
  }, [setFilters]);

  const url = "booknotes";
  return (
    <Layout
      title="Booknotes - What I have learned while reading"
      description={
        "An overview of what I have read, with a filterable list of books and booknotes"
      }
      keywords={[
        "booknotes",
        "books",
        "reading",
        "notes",
        "book summaries",
        "note taking",
        "reading list",
        "book list",
        "bookshelf",
        "book recommendations",
        "book reviews",
        "book notes",
        "reading notes",
        "reading summaries",
        "reading list",
      ]}
      image="/assets/blog/a-bookshelf.png"
      url={url}
      imageAlt={"a bookshelf filled with lots of books"}
    >
      <main className="mb-20 px-3">
        <BreadCrumbs path={url} />

        <Header
          title="Booknotes"
          subtitle="What I have learned while reading"
        />
        <div>
          <Search filters={filters} setFilters={setFilters} />
          <p>Amount: {filteredBooks.length}</p>
        </div>
        <div className="prose-a:no-underline">
          {filteredBooks.map((book, index) => {
            return <BookPreview key={book.link} book={book} index={index} />;
          })}
        </div>
      </main>

      <footer className="mb-20 px-3">
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
}

export function getStaticProps() {
  return {
    props: {
      booknotes: booknotes
        .filter(byOnlyPublished)
        .filter(({ summary }) => summary)
        .map(
          ({
            bookAuthor,
            title,
            rating,
            tags,
            summary,
            detailedNotes,
            excerpt,
            link,
            cover,
            metadata,
            date,
          }) => ({
            bookAuthor,
            cover,
            link,
            title,
            rating,
            tags,
            summary,
            date,
            detailedNotes,
            metadata,
            excerpt: excerpt || "",
          })
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    },
  };
}

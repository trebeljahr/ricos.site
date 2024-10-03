import { Booknote, allBooknotes } from "@contentlayer/generated";
import { useEffect } from "react";
import { Search, useSearch } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import { BookPreview } from "@components/BookPreview";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import Header from "@components/PostHeader";
import { byOnlyPublished } from "src/lib/utils";
import React from "react";

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
      <main>
        <Header
          title="Booknotes"
          subtitle="What I have learned while reading"
        />
        <div>
          <Search filters={filters} setFilters={setFilters} />
          <p>Amount: {filteredBooks.length}</p>
        </div>
        <div className="not-prose">
          {filteredBooks.map((book, index) => {
            return <BookPreview key={book.slug} book={book} index={index} />;
          })}
        </div>
      </main>

      <footer>
        <NewsletterForm />
        <ToTopButton />
      </footer>
    </Layout>
  );
}

export function getStaticProps() {
  return {
    props: {
      booknotes: allBooknotes
        .filter(byOnlyPublished)
        .map(
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

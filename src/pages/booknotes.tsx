import { BookPreview } from "@components/BookPreview";
import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterSignup";
import Header from "@components/PostHeader";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import { Booknote, booknotes } from "@velite";
import { useState } from "react";
import { byOnlyPublished } from "src/lib/utils";

type Props = {
  booknotes: Booknote[];
};

export default function Books({ booknotes }: Props) {
  const [filtered, setFiltered] = useState<Booknote[]>([]);

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
          <Search
            all={booknotes}
            setFiltered={setFiltered}
            searchByTitle="Search by author, title, or tags..."
            searchKeys={["bookAuthor", "title", "tags"]}
          />
          <p>Amount: {filtered.length}</p>
        </div>
        <div className="prose-a:no-underline">
          {filtered.map((book, index) => {
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

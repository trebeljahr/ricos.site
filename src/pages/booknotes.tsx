import { BookPreview } from "@components/BookPreview";
import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { Search } from "@components/SearchBar";
// import Search from "@components/SearchBar/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import type { Booknote } from "@velite";
import allBooknotes from "../../.velite/booknotes.json";
import { useState } from "react";
import { SeoInfo } from "src/lib/getSeoInfo";
import { byOnlyPublished } from "src/lib/utils/filters";
import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";

type Props = {
  booknotes: Booknote[];
  seo: SeoInfo | null;
};

export default function Books({ booknotes, seo }: Props) {
  const [filtered, setFiltered] = useState<Booknote[]>([]);

  const url = "booknotes";

  return (
    <Layout
      title={seo?.metaTitle || "Booknotes - What I have learned while reading"}
      description={seo?.metaDescription || "An overview of what I have read, with a filterable list of books and booknotes"}
      keywords={seo?.keywords || ["booknotes", "books", "reading", "book summaries"]}
      image={seo?.ogImage || "/assets/blog/a-bookshelf.png"}
      url={url}
      imageAlt={seo?.ogImageAlt || "a bookshelf filled with lots of books"}
    >
      <main className="py-20 px-3 max-w-5xl mx-auto">
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

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

export function getStaticProps() {
  const { getSeoInfo } = require("src/lib/getSeoInfo");
  const booknotes = extractAndSortMetadata(allBooknotes).filter(
    ({ summary }) => summary
  );

  return {
    props: {
      booknotes,
      seo: getSeoInfo("/booknotes"),
    },
  };
}

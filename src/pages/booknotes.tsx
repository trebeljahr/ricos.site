import { BookPreview } from "@components/BookPreview";
import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import type { Booknote } from "@velite";
import { useState } from "react";
import { getSeoInfo, SeoInfo } from "src/lib/getSeoInfo";

import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";

type Props = {
  booknotes: Booknote[];
  seo: SeoInfo | null;
};

export default function Books({ booknotes, seo }: Props) {
  const [filtered, setFiltered] = useState<Booknote[] | null>(null);

  const displayedBooks = filtered ?? booknotes;
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
          <p>Amount: {displayedBooks.length}</p>
        </div>
        <div className="prose-a:no-underline">
          {displayedBooks.map((book, index) => {
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

export async function getStaticProps() {
  const { loadVeliteData } = await import("src/lib/loadVeliteData");
  const allBooknotes = loadVeliteData("booknotes.json");
  if (!Array.isArray(allBooknotes) || allBooknotes.length === 0) {
    throw new Error(
      "booknotes.json is empty — velite likely did not run or the content submodule is missing. Refusing to build an empty /booknotes page."
    );
  }
  const booknotes = extractAndSortMetadata(allBooknotes).filter(
    ({ summary }: any) => summary
  );
  if (booknotes.length === 0) {
    throw new Error(
      `No published booknotes with summary:true found (loaded ${allBooknotes.length} raw entries). Refusing to build an empty /booknotes page.`
    );
  }

  return {
    props: {
      booknotes,
      seo: getSeoInfo("/booknotes"),
    },
  };
}

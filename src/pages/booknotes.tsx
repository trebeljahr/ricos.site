import { BookPreview } from "@components/BookPreview";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import type { Booknote } from "@velite";
import { useRef } from "react";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import { useListTransition } from "src/lib/listTransition";

import { extractAndSortMetadata } from "src/lib/utils/extractAndSortMetadata";

type Props = {
  booknotes: Booknote[];
  seo: SeoInfo | null;
};

export default function Books({ booknotes, seo }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [displayedBooks, setDisplayedBooks] = useListTransition(
    booknotes,
    listRef,
    ":scope > *",
    150,
  );
  const url = "booknotes";

  return (
    <Layout
      title={seo?.metaTitle || "Booknotes - What I have learned while reading"}
      description={
        seo?.metaDescription ||
        "An overview of what I have read, with a filterable list of books and booknotes"
      }
      keywords={seo?.keywords || ["booknotes", "books", "reading", "book summaries"]}
      image={seo?.ogImage || "/assets/blog/a-bookshelf.png"}
      url={url}
      imageAlt={seo?.ogImageAlt || "a bookshelf filled with lots of books"}
    >
      <main className="pt-5 pb-20 px-3 max-w-5xl mx-auto">
        <Header
          breadcrumbs={{ path: url }}
          title="Booknotes"
          subtitle="What I have learned while reading"
        />
        <div>
          <Search
            all={booknotes}
            setFiltered={setDisplayedBooks}
            searchByTitle="Search by author, title, or tags..."
            searchKeys={["bookAuthor", "title", "tags"]}
          />
          <p>Amount: {displayedBooks.length}</p>
        </div>
        <div ref={listRef} className="prose-a:no-underline">
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
      "booknotes.json is empty — velite likely did not run or the content submodule is missing. Refusing to build an empty /booknotes page.",
    );
  }
  const booknotes = extractAndSortMetadata(allBooknotes).filter(({ summary }: any) => summary);
  if (booknotes.length === 0) {
    throw new Error(
      `No published booknotes with summary:true found (loaded ${allBooknotes.length} raw entries). Refusing to build an empty /booknotes page.`,
    );
  }

  return {
    props: {
      booknotes,
      seo: getSeoInfo("/booknotes"),
    },
  };
}

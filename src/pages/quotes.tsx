import { BreadCrumbs } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import { useState } from "react";
import { type SeoInfo, getSeoInfo } from "src/lib/getSeoInfo";
import quotesJSON from "../content/Notes/pages/quotes.json";

const quotes: Quote[] = quotesJSON;

type Quote = {
  author: string;
  content: string;
  tags: string[];
};

export default function Quotes({ seo }: { seo: SeoInfo | null }) {
  const [filtered, setFiltered] = useState<Quote[] | null>(null);
  const displayedQuotes = filtered ?? quotes;
  const url = "quotes";

  return (
    <Layout
      title={seo?.metaTitle || "Quotes - a collection of quotes from a curious person"}
      description={
        seo?.metaDescription ||
        "A curated collection of quotes from books, movies, podcasts, and blog posts."
      }
      image={seo?.ogImage || "/assets/midjourney/a-collection-of-notes-of-importance.jpg"}
      imageAlt={seo?.ogImageAlt || "a collection of handwritten notes on paper"}
      url={url}
      keywords={seo?.keywords || ["quotes", "collection", "books", "inspiration"]}
    >
      <main className="py-20 px-3 mx-auto max-w-prose">
        <BreadCrumbs path={url} />

        <section>
          <Header title="Quotes" subtitle="Snippets of writing that I want to remember" />

          <Search
            all={quotes}
            setFiltered={setFiltered}
            searchKeys={["author"]}
            searchByTitle="Search by author..."
          />
          <p>Amount: {displayedQuotes.length}</p>
          {displayedQuotes.map(({ author, content }, index) => {
            return (
              <div key={author + index} className="quote">
                <blockquote>
                  <p>{content}</p>
                </blockquote>
                <p>— {author}</p>
              </div>
            );
          })}
        </section>

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

export function getStaticProps() {
  return { props: { seo: getSeoInfo("/quotes") } };
}

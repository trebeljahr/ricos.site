import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { type NumberedQuote, type Quote, QuoteMosaic } from "@components/QuoteMosaic";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import { useState } from "react";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import quotesJSON from "../content/Notes/pages/quotes.json";

// `tagText` flattens tags into one string, since fuzzysort only searches string keys.
type SearchableQuote = NumberedQuote & { tagText: string };

const quotes: SearchableQuote[] = (quotesJSON as Quote[]).map((quote, index) => ({
  ...quote,
  id: index + 1,
  tagText: quote.tags.join(" "),
}));

export default function Quotes({ seo }: { seo: SeoInfo | null }) {
  const [filtered, setFiltered] = useState<SearchableQuote[] | null>(null);
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
      <main className="pt-5 pb-20 px-3 max-w-5xl mx-auto">
        <section>
          <Header
            breadcrumbs={{ path: url }}
            title="Quotes"
            subtitle="Snippets of writing that I want to remember"
          />

          <Search
            all={quotes}
            setFiltered={setFiltered}
            searchKeys={["content", "author", "tagText"]}
            threshold={0.3}
            searchByTitle="Search by words, author or tag..."
          />
          <p>Amount: {displayedQuotes.length}</p>
          <QuoteMosaic quotes={displayedQuotes} />
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

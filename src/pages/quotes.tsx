import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { type NumberedQuote, type Quote, QuoteMosaic } from "@components/QuoteMosaic";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import { useState } from "react";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import type { Portraits } from "src/lib/quotePortraits";
import quotesJSON from "../content/Notes/pages/quotes.json";

// fuzzysort only searches string keys, so tags and the source title get flattened.
type SearchableQuote = NumberedQuote & { tagText: string; sourceTitle: string };

const quotes: SearchableQuote[] = (quotesJSON as Quote[]).map((quote, index) => ({
  ...quote,
  id: index + 1,
  tagText: quote.tags.join(" "),
  sourceTitle: quote.source?.title ?? "",
}));

export default function Quotes({ seo, portraits }: { seo: SeoInfo | null; portraits: Portraits }) {
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
            searchKeys={["content", "author", "tagText", "sourceTitle"]}
            threshold={0.3}
            searchByTitle="Search by words, author, tag or book..."
          />
          <p>Amount: {displayedQuotes.length}</p>
          <QuoteMosaic quotes={displayedQuotes} portraits={portraits} />
        </section>

        <footer>
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  // Read at build time rather than imported: the file only exists once portraits
  // have been reviewed and applied (pnpm quotes:portraits:apply).
  const { readFile } = await import("node:fs/promises");
  let portraits: Portraits = {};
  try {
    portraits = JSON.parse(await readFile("src/content/Notes/pages/quote-portraits.json", "utf8"));
  } catch {}
  return { props: { seo: getSeoInfo("/quotes"), portraits } };
}

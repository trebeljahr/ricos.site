import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { type NumberedQuote, type Quote, QuoteMosaic } from "@components/QuoteMosaic";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import clsx from "clsx";
import { useMemo, useState } from "react";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import type { Portraits } from "src/lib/quotePortraits";
import quotesJSON from "../content/Notes/pages/quotes.json";

// fuzzysort only searches string keys, so the source title gets flattened.
type SearchableQuote = NumberedQuote & { sourceTitle: string };

const quotes: SearchableQuote[] = (quotesJSON as Quote[]).map((quote, index) => ({
  ...quote,
  id: index + 1,
  sourceTitle: quote.source?.title ?? "",
}));

// Every topic with its quote count, most used first, for the filter above the quotes.
const topics = Object.entries(
  quotes.reduce<Record<string, number>>((counts, quote) => {
    for (const tag of quote.tags) counts[tag] = (counts[tag] ?? 0) + 1;
    return counts;
  }, {}),
).sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b));

const chip = (active: boolean) =>
  clsx(
    "rounded-full px-3 py-1 text-sm transition-colors",
    active
      ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
  );

export default function Quotes({ seo, portraits }: { seo: SeoInfo | null; portraits: Portraits }) {
  const [searched, setSearched] = useState<SearchableQuote[]>(quotes);
  const [topic, setTopic] = useState<string | null>(null);
  const displayedQuotes = useMemo(
    () => (topic ? searched.filter((quote) => quote.tags.includes(topic)) : searched),
    [searched, topic],
  );
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
            setFiltered={setSearched}
            searchKeys={["content", "author", "sourceTitle"]}
            threshold={0.3}
            searchByTitle="Search by words, author or book..."
          />
          <fieldset className="not-prose mt-4 flex flex-wrap gap-2">
            <legend className="sr-only">Filter by topic</legend>
            <button
              type="button"
              aria-pressed={topic === null}
              onClick={() => setTopic(null)}
              className={chip(topic === null)}
            >
              All
            </button>
            {topics.map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                aria-pressed={topic === tag}
                onClick={() => setTopic(topic === tag ? null : tag)}
                className={chip(topic === tag)}
              >
                {tag} <span className="opacity-60">{count}</span>
              </button>
            ))}
          </fieldset>
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

import { FiChevronDown, FiX } from "@components/Icons";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header from "@components/PostHeader";
import { type NumberedQuote, type Quote, QuoteMosaic } from "@components/QuoteMosaic";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import clsx from "clsx";
import { useMemo, useRef, useState } from "react";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import { useListTransition } from "src/lib/listTransition";
import type { Portraits } from "src/lib/quotePortraits";
import quotesJSON from "../content/Notes/pages/quotes.json";

// fuzzysort only searches string keys, so the source title gets flattened.
type SearchableQuote = NumberedQuote & { sourceTitle: string };

const quotes: SearchableQuote[] = (quotesJSON as Quote[]).map((quote, index) => ({
  ...quote,
  id: index + 1,
  sourceTitle: quote.source?.title ?? "",
}));

// Every topic, most used first, for the filter above the quotes.
const topics = Object.entries(
  quotes.reduce<Record<string, number>>((counts, quote) => {
    for (const tag of quote.tags) counts[tag] = (counts[tag] ?? 0) + 1;
    return counts;
  }, {}),
)
  .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
  .map(([tag]) => tag);

const chip = (active: boolean) =>
  clsx(
    "rounded-full px-3 py-1 text-sm transition-colors",
    active
      ? "bg-gray-950 text-white dark:bg-white dark:text-gray-950"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
  );

export default function Quotes({ seo, portraits }: { seo: SeoInfo | null; portraits: Portraits }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [searched, setSearched] = useListTransition(quotes, listRef, "figure", 150);
  const [topic, setTopic] = useListTransition<string | null>(null, listRef, "figure");
  const [topicsOpen, setTopicsOpen] = useState(false);
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
          <div className="not-prose mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-expanded={topicsOpen}
              aria-controls="quote-topics"
              onClick={() => setTopicsOpen((open) => !open)}
              className={clsx(chip(false), "inline-flex items-center gap-1.5")}
            >
              Topics
              <FiChevronDown
                aria-hidden
                className={clsx("transition-transform", topicsOpen && "rotate-180")}
              />
            </button>
            {topic && (
              <button
                type="button"
                onClick={() => setTopic(null)}
                aria-label={`Clear topic filter: ${topic}`}
                className={clsx(chip(true), "inline-flex items-center gap-1.5")}
              >
                {topic}
                <FiX aria-hidden />
              </button>
            )}
          </div>
          {topicsOpen && (
            <fieldset id="quote-topics" className="not-prose mt-3 flex flex-wrap gap-2">
              <legend className="sr-only">Filter by topic</legend>
              {topics.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={topic === tag}
                  onClick={() => setTopic(topic === tag ? null : tag)}
                  className={chip(topic === tag)}
                >
                  {tag}
                </button>
              ))}
            </fieldset>
          )}
          <p>Amount: {displayedQuotes.length}</p>
          <div ref={listRef}>
            <QuoteMosaic quotes={displayedQuotes} portraits={portraits} />
          </div>
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

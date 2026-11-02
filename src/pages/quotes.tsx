import { chipClass, FilterChip } from "@components/FilterChip";
import { FiChevronDown, FiX } from "@components/Icons";
import Layout from "@components/Layout";
import { NewsletterForm } from "@components/NewsletterForm";
import Header, { PageMain } from "@components/PostHeader";
import {
  type NumberedQuote,
  type Quote,
  QuoteMosaic,
  ROWS_PER_BATCH,
  toRowItems,
} from "@components/QuoteMosaic";
import { Search } from "@components/SearchBar";
import { ToTopButton } from "@components/ToTopButton";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import { useListTransition } from "src/lib/listTransition";
import type { Portraits } from "src/lib/quotePortraits";
import { planQuoteRows, type Row } from "src/lib/quoteRows";
import { whenIdle } from "src/lib/whenIdle";

// fuzzysort only searches string keys, so the source title gets flattened.
type SearchableQuote = NumberedQuote & { sourceTitle: string };

const toSearchable = (list: Quote[]): SearchableQuote[] =>
  list.map((quote, index) => ({
    ...quote,
    id: index + 1,
    sourceTitle: quote.source?.title ?? "",
  }));

type Props = {
  seo: SeoInfo | null;
  portraits: Portraits;
  /** The quotes in the first batch of rows, and those rows, planned over all quotes. */
  firstQuotes: SearchableQuote[];
  firstRows: Row[];
  totalQuotes: number;
  topics: string[];
};

export default function Quotes({
  seo,
  portraits,
  firstQuotes,
  firstRows,
  totalQuotes,
  topics,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  // All quotes are 277 KB. The page paints and hydrates with the first batch, and
  // the rest arrives before anyone can scroll or search far.
  const [allQuotes, setAllQuotes] = useState(firstQuotes);
  useEffect(() => {
    whenIdle()
      .then(() => import("../content/Notes/pages/quotes.json"))
      .then((module) => setAllQuotes(toSearchable(module.default as Quote[])));
  }, []);
  const [searched, setSearched] = useListTransition(firstQuotes, listRef, "figure", 150);
  const [topic, setTopic] = useListTransition<string | null>(null, listRef, "figure");
  const [topicsOpen, setTopicsOpen] = useState(false);
  // Nothing searched yet: follow the list as it grows, without animating that.
  const unsearched = searched === firstQuotes;
  const shownBeforeTopic = unsearched ? allQuotes : searched;
  const displayedQuotes = useMemo(
    () =>
      topic ? shownBeforeTopic.filter((quote) => quote.tags.includes(topic)) : shownBeforeTopic,
    [shownBeforeTopic, topic],
  );
  const stillLoading = allQuotes === firstQuotes;
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
      <PageMain>
        <section>
          <Header
            breadcrumbs={{ path: url }}
            title="Quotes"
            subtitle="Snippets of writing that I want to remember"
          />

          <Search
            all={allQuotes}
            setFiltered={setSearched}
            searchKeys={["content", "author", "sourceTitle"]}
            threshold={0.3}
            searchByTitle="Search by words, author or book..."
          />
          <div className="not-prose mt-stack flex flex-wrap items-center gap-tight">
            <button
              type="button"
              aria-expanded={topicsOpen}
              aria-controls="quote-topics"
              onClick={() => setTopicsOpen((open) => !open)}
              className={clsx(chipClass(false), "inline-flex items-center gap-1.5")}
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
                className={clsx(chipClass(true), "inline-flex items-center gap-1.5")}
              >
                {topic}
                <FiX aria-hidden />
              </button>
            )}
          </div>
          {topicsOpen && (
            <fieldset id="quote-topics" className="not-prose mt-label flex flex-wrap gap-tight">
              <legend className="sr-only">Filter by topic</legend>
              {topics.map((tag) => (
                <FilterChip
                  key={tag}
                  active={topic === tag}
                  onClick={() => setTopic(topic === tag ? null : tag)}
                >
                  {tag}
                </FilterChip>
              ))}
            </fieldset>
          )}
          <p>Amount: {stillLoading ? totalQuotes : displayedQuotes.length}</p>
          <div ref={listRef}>
            <QuoteMosaic
              quotes={displayedQuotes}
              portraits={portraits}
              plannedRows={stillLoading ? firstRows : undefined}
            />
          </div>
        </section>

        <footer className="mt-section">
          <NewsletterForm />
          <ToTopButton />
        </footer>
      </PageMain>
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

  const { default: quotesJSON } = await import("../content/Notes/pages/quotes.json");
  const quotes = toSearchable(quotesJSON as Quote[]);
  const firstRows = planQuoteRows(toRowItems(quotes, portraits)).slice(0, ROWS_PER_BATCH);
  const shownInFirstRows = firstRows.flatMap((row) => row.units.flatMap((unit) => unit.items));

  // Every topic, most used first, for the filter above the quotes.
  const topics = Object.entries(
    quotes.reduce<Record<string, number>>((counts, quote) => {
      for (const tag of quote.tags) counts[tag] = (counts[tag] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
    .map(([tag]) => tag);

  return {
    props: {
      seo: getSeoInfo("/quotes"),
      portraits,
      firstQuotes: quotes.slice(0, Math.max(...shownInFirstRows) + 1),
      firstRows,
      totalQuotes: quotes.length,
      topics,
    },
  };
}

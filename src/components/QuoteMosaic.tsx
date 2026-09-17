import clsx from "clsx";
import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { cleanAuthor, type Portrait, type Portraits } from "src/lib/quotePortraits";
import { planQuoteRows } from "src/lib/quoteRows";

export type Quote = {
  author: string;
  content: string;
  tags: string[];
  /** Where the quote was collected, e.g. the booknote it came from. */
  source?: { title: string; url: string };
};

/** A quote plus its position in the full collection, a stable key while filtering. */
export type NumberedQuote = Quote & { id: number };

// FNV-1a. The mark colour comes from the quote text, not Math.random, so the
// server and client agree and a quote keeps its colour between visits.
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Sets a flex shorthand from md up; phones stack every card at full width. */
const flex = (value: string) => ({ "--flex": value }) as CSSProperties;
const FLEX_FROM_MD = "md:[flex:var(--flex)]";

// Rendering all ~900 cards at once makes a huge HTML page and a slow hydration,
// so rows are revealed in batches as the reader nears the bottom.
const ROWS_PER_BATCH = 15;

// Steps along the newsletter gradient (green-400 -> teal-400 -> blue-600).
const MARK_COLORS = [
  "text-green-400/80",
  "text-emerald-400/80",
  "text-teal-400/80",
  "text-cyan-500/70",
  "text-sky-500/70",
  "text-blue-600/70 dark:text-blue-500/80",
];

function Avatar({ author, portrait }: { author: string; portrait: Portrait }) {
  return (
    <a
      href={portrait.page}
      target="_blank"
      rel="noreferrer"
      title={`Photo of ${author}: ${portrait.artist}, ${portrait.license}, via Wikimedia Commons`}
      className="shrink-0"
    >
      {/* Hotlinked Commons thumbnail: next/image would route it through our own image backend. */}
      {/* biome-ignore lint/performance/noImgElement: see above */}
      <img
        src={portrait.thumb}
        alt={author}
        width={36}
        height={36}
        loading="lazy"
        className="size-9 rounded-full object-cover object-top contrast-125 grayscale ring-1 ring-black/10 dark:ring-white/10"
      />
    </a>
  );
}

function QuoteSlip({
  quote,
  portrait,
  style,
}: {
  quote: NumberedQuote;
  portrait?: Portrait;
  style: CSSProperties;
}) {
  const author = cleanAuthor(quote.author);
  const markColor = MARK_COLORS[(hash(quote.content) >>> 8) % MARK_COLORS.length];

  return (
    <figure
      style={style}
      className={clsx(
        "relative m-0 flex flex-col overflow-hidden rounded-sm bg-stone-50 px-7 pt-16 pb-6 shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-slate-800/70 dark:ring-white/10",
        FLEX_FROM_MD,
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "pointer-events-none absolute top-3 left-6 font-serif text-8xl leading-none select-none",
          markColor,
        )}
      >
        &ldquo;
      </span>
      <blockquote className="m-0 grow font-serif text-lg leading-relaxed whitespace-pre-line text-zinc-800 dark:text-slate-200">
        {quote.content}
      </blockquote>
      <figcaption className="mt-5 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
        {portrait && <Avatar author={author} portrait={portrait} />}
        <span className="min-w-0">
          <span className="text-xs font-semibold tracking-widest uppercase">— {author}</span>
          {quote.source && (
            <>
              {" · "}
              <Link
                href={quote.source.url}
                className="italic underline decoration-gray-400/50 underline-offset-2 hover:text-gray-900 dark:hover:text-gray-100"
              >
                {quote.source.title}
              </Link>
            </>
          )}
          {quote.tags.length > 0 && (
            <span className="mt-1 block text-xs text-gray-500 dark:text-gray-500">
              {quote.tags.map((tag) => `#${tag}`).join(" ")}
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

export function QuoteMosaic({
  quotes,
  portraits,
}: {
  quotes: NumberedQuote[];
  portraits: Portraits;
}) {
  const rows = useMemo(
    () =>
      planQuoteRows(
        quotes.map((quote) => ({
          length: quote.content.length,
          tallCaption: Boolean(
            portraits[cleanAuthor(quote.author)] || quote.source || quote.tags.length > 0,
          ),
        })),
      ),
    [quotes, portraits],
  );

  // A new list (a search, or clearing one) starts again from the first batch.
  const [visibleRows, setVisibleRows] = useState(ROWS_PER_BATCH);
  const [shownQuotes, setShownQuotes] = useState(quotes);
  if (shownQuotes !== quotes) {
    setShownQuotes(quotes);
    setVisibleRows(ROWS_PER_BATCH);
  }

  const hasMore = visibleRows < rows.length;
  const sentinelRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-observe after each batch, because an observer only fires on changes and the sentinel can still be in view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleRows((count) => count + ROWS_PER_BATCH);
        }
      },
      { rootMargin: "1200px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleRows]);

  const slip = (index: number, style: CSSProperties) => {
    const quote = quotes[index];
    return (
      <QuoteSlip
        key={quote.id}
        quote={quote}
        portrait={portraits[cleanAuthor(quote.author)]}
        style={style}
      />
    );
  };

  return (
    <div className="not-prose flex flex-col gap-4">
      {rows.slice(0, visibleRows).map((row) => (
        <div key={quotes[row.units[0].items[0]].id} className="flex flex-col gap-4 md:flex-row">
          {row.units.map((unit) =>
            unit.items.length === 1 ? (
              slip(unit.items[0], flex(`${unit.width} 1 0px`))
            ) : (
              // Two short quotes stacked beside a taller one. The stack takes
              // the row's height and shares it out by what each card needs.
              <div
                key={quotes[unit.items[0]].id}
                style={flex(`${unit.width} 1 0px`)}
                className={clsx("flex flex-col gap-4", FLEX_FROM_MD)}
              >
                {unit.items.map((index, k) => slip(index, flex(`${unit.heights[k]} 1 auto`)))}
              </div>
            ),
          )}
          {row.spare > 0 && (
            <div
              aria-hidden
              style={flex(`${row.spare} 1 0px`)}
              className={clsx("hidden md:block", FLEX_FROM_MD)}
            />
          )}
        </div>
      ))}
      {hasMore && <div ref={sentinelRef} aria-hidden className="h-px" />}
    </div>
  );
}

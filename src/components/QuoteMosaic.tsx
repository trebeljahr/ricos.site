import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { cleanAuthor, type Portrait, type Portraits } from "src/lib/quotePortraits";

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

// Masonry on a CSS grid: rows are ROW px tall and each card spans as many as
// its height needs, plus GAP below it. All cards are one column wide, so the
// dense grid always places the next card at the bottom of the shortest column
// and no holes can form. Order still runs left to right, top to bottom.
const ROW = 4;
const GAP = 16;

// Before the browser measures the real card, estimate its height from the
// text so the first paint is close: a desktop column fits about 33 serif
// characters per line at 29px line height, plus the card's padding and caption.
function estimatedSpan(quote: Quote, hasPortrait: boolean) {
  const lines = quote.content
    .split("\n")
    .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil((paragraph.length * 1.1) / 33)), 0);
  const caption = hasPortrait || quote.source || quote.tags.length > 0 ? 36 : 16;
  const height = 64 + lines * 29 + 20 + caption + 24;
  return Math.ceil((height + GAP) / ROW);
}

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

function QuoteSlip({ quote, portrait }: { quote: NumberedQuote; portrait?: Portrait }) {
  const author = cleanAuthor(quote.author);
  const markColor = MARK_COLORS[(hash(quote.content) >>> 8) % MARK_COLORS.length];

  return (
    <div style={{ gridRowEnd: `span ${estimatedSpan(quote, Boolean(portrait))}` }}>
      <figure className="relative m-0 flex flex-col overflow-hidden rounded-sm bg-stone-50 px-7 pt-16 pb-6 shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:bg-slate-800/70 dark:ring-white/10">
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
    </div>
  );
}

export function QuoteMosaic({
  quotes,
  portraits,
}: {
  quotes: NumberedQuote[];
  portraits: Portraits;
}) {
  const grid = useRef<HTMLDivElement>(null);

  // Replace the estimated spans with measured ones, and keep them right when
  // cards change height (column width, fonts loading, filtering).
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-observe the new cards whenever the list changes
  useEffect(() => {
    const cells = Array.from(grid.current?.children ?? []) as HTMLElement[];
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const figure = entry.target as HTMLElement;
        const span = Math.ceil((figure.offsetHeight + GAP) / ROW);
        const cell = figure.parentElement;
        if (cell) cell.style.gridRowEnd = `span ${span}`;
      }
    });
    for (const cell of cells) {
      if (cell.firstElementChild) observer.observe(cell.firstElementChild);
    }
    return () => observer.disconnect();
  }, [quotes]);

  return (
    <div
      ref={grid}
      className="not-prose grid grid-flow-row-dense auto-rows-[4px] grid-cols-1 gap-x-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {quotes.map((quote) => (
        <QuoteSlip key={quote.id} quote={quote} portrait={portraits[cleanAuthor(quote.author)]} />
      ))}
    </div>
  );
}

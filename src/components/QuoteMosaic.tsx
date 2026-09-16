import clsx from "clsx";
import Link from "next/link";
import type { CSSProperties } from "react";
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

// FNV-1a. A small width jitter comes from the quote text, not Math.random, so
// the server and client render the same layout and a quote keeps its width
// between visits.
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Justified rows: cards wrap like words in a line, and each row stretches to
// fill the full width, so there are no holes. A card's base width follows the
// length of its quote, which keeps the cards in a row at similar heights at
// one shared font size. Row filling grows every card in proportion to its base
// width, so that balance survives the stretch.
const CHAR_WIDTH = 1.6;
const MIN_WIDTH = 250;
const MAX_WIDTH = 640;

function baseWidth(quote: Quote) {
  const jitter = 0.9 + (hash(quote.content) % 21) / 100;
  const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, quote.content.length * CHAR_WIDTH));
  return Math.round(width * jitter);
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
  const width = baseWidth(quote);
  const markColor = MARK_COLORS[(hash(quote.content) >>> 8) % MARK_COLORS.length];

  return (
    <figure
      style={{ "--width": `${width}px`, "--grow": width } as CSSProperties}
      className="relative m-0 flex w-full flex-col overflow-hidden rounded-sm bg-stone-50 px-7 pt-16 pb-6 shadow-sm ring-1 ring-black/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:w-auto md:[flex:var(--grow)_1_var(--width)] dark:bg-slate-800/70 dark:ring-white/10"
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
  return (
    <div className="not-prose flex flex-wrap gap-4">
      {quotes.map((quote) => (
        <QuoteSlip key={quote.id} quote={quote} portrait={portraits[cleanAuthor(quote.author)]} />
      ))}
      {/* Soaks up the leftover space in the last row, so its cards keep their base width. */}
      <div aria-hidden className="hidden grow-[99999] basis-0 md:block" />
    </div>
  );
}

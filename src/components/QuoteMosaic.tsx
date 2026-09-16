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

  return (
    <figure
      style={{ "--width": `${width}px`, "--grow": width } as CSSProperties}
      className="m-0 flex w-full flex-col rounded-sm bg-stone-50 p-5 shadow-sm ring-1 ring-black/5 md:w-auto md:[flex:var(--grow)_1_var(--width)] dark:bg-slate-800/70 dark:ring-white/10"
    >
      <blockquote className="m-0 grow text-lg whitespace-pre-line text-zinc-800 dark:text-slate-200">
        {quote.content}
      </blockquote>
      <figcaption className="mt-4 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
        {portrait && <Avatar author={author} portrait={portrait} />}
        <span className="min-w-0">
          <span className="font-medium tracking-wide uppercase">{author}</span>
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
    <div className="not-prose flex flex-wrap gap-3">
      {quotes.map((quote) => (
        <QuoteSlip key={quote.id} quote={quote} portrait={portraits[cleanAuthor(quote.author)]} />
      ))}
      {/* Soaks up the leftover space in the last row, so its cards keep their base width. */}
      <div aria-hidden className="hidden grow-[99999] basis-0 md:block" />
    </div>
  );
}

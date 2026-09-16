import clsx from "clsx";
import Link from "next/link";
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

// FNV-1a. The card shape comes from the quote text, not Math.random, so the
// server and client render the same mosaic and a quote keeps its shape
// between visits.
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Class strings are spelled out in full so Tailwind can find them.
// Columns: 1 on phones, 4 from md, 6 from lg.
const shapes = {
  short: [
    { span: "md:col-span-2 lg:col-span-2", text: "text-2xl leading-snug" },
    { span: "md:col-span-2 lg:col-span-3", text: "text-2xl leading-snug md:text-3xl" },
    {
      span: "md:col-span-2 lg:col-span-2 md:row-span-2",
      text: "text-2xl leading-snug md:text-4xl md:leading-tight",
    },
  ],
  medium: [
    { span: "md:col-span-2 lg:col-span-2", text: "text-lg" },
    { span: "md:col-span-2 lg:col-span-3", text: "text-lg md:text-xl" },
  ],
  long: [
    { span: "md:col-span-2 lg:col-span-3", text: "text-base" },
    { span: "md:col-span-4 lg:col-span-4", text: "text-lg" },
    { span: "md:col-span-2 lg:col-span-2 md:row-span-2", text: "text-base" },
  ],
  xlong: [
    { span: "md:col-span-4 lg:col-span-4", text: "text-base" },
    { span: "md:col-span-4 lg:col-span-3 lg:row-span-2", text: "text-base" },
  ],
};

function sizeOf(content: string): keyof typeof shapes {
  if (content.length <= 90) return "short";
  if (content.length <= 200) return "medium";
  if (content.length <= 400) return "long";
  return "xlong";
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
  const h = hash(quote.content);
  const options = shapes[sizeOf(quote.content)];
  const shape = options[h % options.length];

  return (
    <figure
      className={clsx(
        "m-0 flex flex-col rounded-sm bg-stone-50 p-5 shadow-sm ring-1 ring-black/5 dark:bg-slate-800/70 dark:ring-white/10",
        shape.span,
      )}
    >
      <blockquote
        className={clsx(
          "m-0 flex grow items-center whitespace-pre-line text-zinc-800 dark:text-slate-200",
          shape.text,
        )}
      >
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
    <div className="not-prose grid grid-flow-row-dense auto-rows-[minmax(7rem,auto)] grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {quotes.map((quote) => (
        <QuoteSlip key={quote.id} quote={quote} portrait={portraits[cleanAuthor(quote.author)]} />
      ))}
    </div>
  );
}

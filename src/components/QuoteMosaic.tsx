import clsx from "clsx";

export type Quote = {
  author: string;
  content: string;
  tags: string[];
};

/** A quote plus its slip number: the position in the full collection, so it stays put while filtering. */
export type NumberedQuote = Quote & { id: number };

// FNV-1a. Layout choices come from the quote text, not Math.random, so the
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

const papers = [
  "bg-stone-50 dark:bg-slate-800/70",
  "bg-amber-50/80 dark:bg-amber-950/25",
  "bg-sky-50/80 dark:bg-sky-950/30",
  "bg-white dark:bg-gray-800/70",
];

function sizeOf(content: string): keyof typeof shapes {
  if (content.length <= 90) return "short";
  if (content.length <= 200) return "medium";
  if (content.length <= 400) return "long";
  return "xlong";
}

function QuoteSlip({ quote }: { quote: NumberedQuote }) {
  const h = hash(quote.content);
  const options = shapes[sizeOf(quote.content)];
  const shape = options[h % options.length];
  const paper = papers[(h >>> 8) % papers.length];

  return (
    <figure
      className={clsx(
        "m-0 flex flex-col rounded-sm p-5 shadow-sm ring-1 ring-black/5 dark:ring-white/10",
        paper,
        shape.span,
      )}
    >
      {/* Slip header: number and rule, like an index card in a Zettelkasten. */}
      <div className="mb-3 flex items-baseline justify-between border-b border-red-300/70 pb-1 dark:border-red-400/30">
        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
          № {String(quote.id).padStart(3, "0")}
        </span>
        {quote.tags.length > 0 && (
          <span className="truncate pl-3 text-xs text-gray-500 dark:text-gray-400">
            {quote.tags.map((tag) => `#${tag}`).join(" ")}
          </span>
        )}
      </div>
      <blockquote
        className={clsx(
          "m-0 flex grow items-center whitespace-pre-line text-zinc-800 dark:text-slate-200",
          shape.text,
        )}
      >
        {quote.content}
      </blockquote>
      <figcaption className="mt-4 text-sm font-medium tracking-wide text-gray-600 uppercase dark:text-gray-400">
        {quote.author}
      </figcaption>
    </figure>
  );
}

export function QuoteMosaic({ quotes }: { quotes: NumberedQuote[] }) {
  return (
    <div className="not-prose grid grid-flow-row-dense auto-rows-[minmax(7rem,auto)] grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-6">
      {quotes.map((quote) => (
        <QuoteSlip key={quote.id} quote={quote} />
      ))}
    </div>
  );
}

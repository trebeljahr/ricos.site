import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import clsx from "clsx";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Markable, MarkStyles, sendMarks, wholeTextHref } from "src/components/diary/Markable";
import type { Mark, MarkBook } from "src/lib/diaryMarks";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";
import { type Passage, termPattern } from "src/lib/notesSearch";
import { notesIndex, readMarks } from "src/lib/notesStore";

// The other half of /dev/diary: where marked passages and everything else in
// private Notes get cut across, to write from them. Search any words across all
// of it, mark what is useful, sort marks into piles (a mark can sit in several),
// order a pile and write it out as a draft for Obsidian. Same guards as
// /dev/diary; nothing here leaves this machine.

type Props = {
  book: MarkBook;
  sources: { name: string; passages: number }[];
  passages: number;
};

const fmt = (n: number) => n.toLocaleString("en-US");
const smallButton =
  "rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:border-accent dark:border-gray-600 dark:text-gray-200";

function metaOf(p: { title: string; date: string | null; heading?: string }) {
  // A dated file without a title is named after its date.
  const title = p.title === p.date ? null : p.title;
  return [p.date, title, p.heading?.replace(/^#+\s*|\*\*/g, "")].filter(Boolean).join(" · ");
}

async function findPassages(body: Record<string, unknown>) {
  const response = await fetch("/api/dev/diary/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return (await response.json()) as { passages: Passage[]; total: number };
}

function PassageRow({
  passage,
  book,
  terms,
  onMark,
  source,
}: {
  passage: Passage;
  book: MarkBook;
  terms?: RegExp | null;
  onMark: (passage: Passage, quote: string) => void;
  source?: boolean;
}) {
  const quotes = book.marks.filter((m) => m.rel === passage.rel).map((m) => m.quote);
  return (
    <li className="border-t border-gray-200 pt-label dark:border-gray-700">
      <p className="not-prose text-xs text-gray-500">
        {source && <span className="font-semibold">{passage.source} · </span>}
        {metaOf(passage)}
      </p>
      <div className="mt-hair break-words text-base [&>div>*]:my-1">
        <Markable
          markdown={passage.text}
          quotes={quotes}
          terms={terms}
          onMark={(quote) => onMark(passage, quote)}
        />
      </div>
      <p className="not-prose mt-hair flex flex-wrap gap-tight">
        <button type="button" className={smallButton} onClick={() => onMark(passage, passage.text)}>
          Mark all of this
        </button>
        <Link href={wholeTextHref(passage.rel)} className={smallButton}>
          Read in context
        </Link>
      </p>
    </li>
  );
}

function MarkRow({
  mark,
  book,
  save,
  onMarkPassage,
  pile,
}: {
  mark: Mark;
  book: MarkBook;
  save: (body: Record<string, unknown>) => Promise<void>;
  onMarkPassage: (passage: Passage, quote: string) => void;
  pile?: string;
}) {
  const [toPile, setToPile] = useState("");
  const [links, setLinks] = useState<Passage[] | null>(null);
  const piles = book.piles.filter((p) => p.ids.includes(mark.id));
  return (
    <li className="border-t border-gray-200 pt-label dark:border-gray-700">
      <blockquote className="whitespace-pre-line text-base">{mark.quote}</blockquote>
      <div className="not-prose mt-hair flex flex-wrap items-center gap-tight text-xs text-gray-500">
        <Link href={wholeTextHref(mark.rel, mark.id)}>{metaOf(mark)}</Link>
        {piles
          .filter((p) => p.name !== pile)
          .map((p) => (
            <span key={p.name} className="rounded bg-gray-200 px-1.5 dark:bg-gray-800">
              {p.name}
            </span>
          ))}
      </div>
      <form
        className="not-prose mt-hair flex flex-wrap items-center gap-tight"
        onSubmit={(event) => {
          event.preventDefault();
          if (!toPile.trim()) return;
          save({ action: "file", id: mark.id, pile: toPile });
          setToPile("");
        }}
      >
        <input
          value={toPile}
          onChange={(event) => setToPile(event.target.value)}
          list="diary-piles"
          placeholder="Add to pile…"
          aria-label="Add to pile"
          className="w-36 rounded border border-gray-300 bg-transparent px-2 py-0.5 text-xs dark:border-gray-600"
        />
        {pile && (
          <>
            <button
              type="button"
              className={smallButton}
              onClick={() => save({ action: "move", id: mark.id, pile, by: -1 })}
            >
              ↑
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={() => save({ action: "move", id: mark.id, pile, by: 1 })}
            >
              ↓
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={() => save({ action: "unfile", id: mark.id, pile })}
            >
              Out of this pile
            </button>
          </>
        )}
        <button
          type="button"
          className={smallButton}
          onClick={async () =>
            setLinks(
              links ? null : (await findPassages({ like: mark.quote, rel: mark.rel })).passages,
            )
          }
        >
          {links ? "Hide related" : "Related"}
        </button>
        <button
          type="button"
          className={smallButton}
          onClick={() => save({ action: "remove", id: mark.id })}
        >
          Remove mark
        </button>
      </form>
      {links && (
        <div className="mt-label border-l-2 border-accent pl-stack">
          {links.length === 0 && <p className="not-prose text-sm">Nothing close found.</p>}
          <ul className="not-prose list-none space-y-3 p-0">
            {links.map((passage, i) => (
              <PassageRow
                // biome-ignore lint/suspicious/noArrayIndexKey: a stable result list for one mark
                key={`${passage.rel}-${i}`}
                passage={passage}
                book={book}
                onMark={onMarkPassage}
                source
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export default function DiaryDeskPage({ book: initial, sources, passages }: Props) {
  const [book, setBook] = useState(initial);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("");
  const [sort, setSort] = useState<"rank" | "date">("rank");
  const [results, setResults] = useState<{ passages: Passage[]; total: number } | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    let stale = false;
    const timer = setTimeout(() => {
      findPassages({ q: query, source, sort })
        .then((found) => {
          if (!stale) setResults(found);
        })
        .catch((error) => console.warn("Search failed:", error));
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, source, sort]);

  const terms = useMemo(() => termPattern(query), [query]);

  const save = (body: Record<string, unknown>) =>
    sendMarks(body)
      .then((result) => {
        setBook(result.book);
        if (result.path) setDraft(result.path);
      })
      .catch((error) => console.warn("Could not save:", error));

  const markPassage = (passage: Passage, quote: string) =>
    save({
      action: "add",
      quote,
      rel: passage.rel,
      title: passage.title,
      date: passage.date,
    });

  const filed = new Set(book.piles.flatMap((p) => p.ids));
  const loose = book.marks.filter((m) => !filed.has(m.id)).reverse();
  const byId = new Map(book.marks.map((m) => [m.id, m]));

  const rowProps = { book, save, onMarkPassage: markPassage };

  return (
    <Layout
      title="Diary desk (dev)"
      description="Search private notes and assemble marked passages."
      url="dev/diary/desk"
      keywords={["dev"]}
      noindex
    >
      <PageMain>
        <article className="mx-auto max-w-5xl">
          <Header
            breadcrumbs={{ path: "dev/diary/desk" }}
            title="The desk"
            subtitle="Cut across everything you wrote, and pile up what belongs together."
          />
          <MarkStyles />
          <datalist id="diary-piles">
            {book.piles.map((p) => (
              <option key={p.name} value={p.name} />
            ))}
          </datalist>

          <section className="not-prose mt-group">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${fmt(passages)} passages. "Exact words" in quotes.`}
              aria-label="Search your notes"
              className="w-full rounded-md border border-gray-300 bg-transparent px-4 py-3 text-lg dark:border-gray-600"
            />
            <div className="mt-label flex flex-wrap items-center gap-tight text-sm">
              <select
                value={source}
                onChange={(event) => setSource(event.target.value)}
                aria-label="Only this source"
                className="rounded border border-gray-300 bg-transparent px-2 py-1 dark:border-gray-600"
              >
                <option value="">Everything</option>
                {sources.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name} ({fmt(s.passages)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSort(sort === "rank" ? "date" : "rank")}
                className={clsx(smallButton, "py-1 text-sm")}
              >
                {sort === "rank" ? "Best matches first" : "Oldest first"}
              </button>
              {results && (
                <span className="text-gray-500">
                  {fmt(results.passages.length)} of {fmt(results.total)} passages
                </span>
              )}
            </div>
          </section>

          {results && (
            <ul className="mt-para list-none space-y-4 p-0">
              {results.passages.map((passage, i) => (
                <PassageRow
                  // biome-ignore lint/suspicious/noArrayIndexKey: passages can repeat their text
                  key={`${passage.rel}-${i}`}
                  passage={passage}
                  book={book}
                  terms={terms}
                  onMark={markPassage}
                  source
                />
              ))}
            </ul>
          )}

          {book.piles.map((pile) => (
            <section key={pile.name} className="mt-section">
              <div className="not-prose flex flex-wrap items-baseline justify-between gap-tight">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{pile.name}</h2>
                <button
                  type="button"
                  className={smallButton}
                  onClick={() => save({ action: "draft", pile: pile.name })}
                >
                  Write out as a draft
                </button>
              </div>
              <ul className="mt-label list-none space-y-4 p-0">
                {pile.ids.flatMap((id) => {
                  const mark = byId.get(id);
                  return mark ? (
                    <MarkRow key={id} mark={mark} pile={pile.name} {...rowProps} />
                  ) : (
                    []
                  );
                })}
              </ul>
            </section>
          ))}

          {draft && (
            <p className="not-prose mt-para text-sm">
              Draft written:{" "}
              <a href={`obsidian://open?path=${encodeURIComponent(draft)}`} className="break-all">
                {draft}
              </a>
            </p>
          )}

          <section className="mt-section">
            <h2 className="not-prose text-2xl font-bold text-gray-900 dark:text-white">
              Not in a pile yet ({loose.length})
            </h2>
            {book.marks.length === 0 ? (
              <p className="not-prose mt-label text-sm text-gray-500">
                Select text in today's reading, or in a search result, and press Mark.
              </p>
            ) : (
              <ul className="mt-label list-none space-y-4 p-0">
                {loose.map((mark) => (
                  <MarkRow key={mark.id} mark={mark} {...rowProps} />
                ))}
              </ul>
            )}
          </section>
        </article>
      </PageMain>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req }) => {
  if (process.env.NODE_ENV !== "development") return { notFound: true };
  if (!servesPrivateNotes(process.env, clientAddresses(req))) return { notFound: true };

  const index = notesIndex();
  const counts = new Map<string, number>();
  for (const p of index.passages) counts.set(p.source, (counts.get(p.source) ?? 0) + 1);
  return {
    props: {
      book: readMarks(),
      passages: index.passages.length,
      sources: [...counts]
        .map(([name, count]) => ({ name, passages: count }))
        .sort((a, b) => b.passages - a.passages),
    },
  };
};

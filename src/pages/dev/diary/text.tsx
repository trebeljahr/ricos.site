import Layout from "@components/Layout";
import Header, { PageMain } from "@components/PostHeader";
import type { GetServerSideProps } from "next";
import Link from "next/link";
import { useState } from "react";
import { Markable, MarkStyles, MarksHere, sendMarks } from "src/components/diary/Markable";
import type { MarkBook } from "src/lib/diaryMarks";
import { clientAddresses, servesPrivateNotes } from "src/lib/diaryStore";
import { readMarks, readWholeText, type WholeText } from "src/lib/notesStore";

// One file from private Notes in full, word for word, to read a passage in its
// context and mark more of it. Same guards as /dev/diary.

type Props = { text: WholeText; book: MarkBook; jumpTo: string | null };

export default function DiaryTextPage({ text, book: initial, jumpTo }: Props) {
  const [book, setBook] = useState(initial);
  const marks = book.marks.filter((m) => m.rel === text.rel);
  const save = (body: Record<string, unknown>) =>
    sendMarks(body)
      .then((result) => setBook(result.book))
      .catch((error) => console.warn("Could not save the mark:", error));
  return (
    <Layout
      title="Whole text (dev)"
      description="One private note in full."
      url="dev/diary/text"
      keywords={["dev"]}
      noindex
    >
      <PageMain>
        <article className="mx-auto max-w-5xl">
          <Header breadcrumbs={{ path: "dev/diary/text" }} title={text.title} subtitle={text.rel} />
          <MarkStyles />
          <p className="not-prose mt-label flex flex-wrap gap-para text-sm">
            <a href={`obsidian://open?path=${encodeURIComponent(text.path)}`}>Edit in Obsidian</a>
            <Link href="/dev/diary/desk">The desk</Link>
            <Link href="/dev/diary">Today's reading</Link>
          </p>
          <div className="mt-group max-w-prose break-words border-l-2 border-gray-200 pl-6 dark:border-gray-700">
            <Markable
              markdown={text.body}
              quotes={marks.map((m) => m.quote)}
              scrollTo={jumpTo ?? undefined}
              onMark={(quote) =>
                save({ action: "add", quote, rel: text.rel, title: text.title, date: text.date })
              }
            />
          </div>
          <MarksHere
            marks={marks}
            onRemove={(id) => save({ action: "remove", id })}
            className="mt-para max-w-prose"
          />
        </article>
      </PageMain>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, query }) => {
  if (process.env.NODE_ENV !== "development") return { notFound: true };
  if (!servesPrivateNotes(process.env, clientAddresses(req))) return { notFound: true };

  const text = typeof query.rel === "string" ? readWholeText(query.rel) : null;
  if (!text) return { notFound: true };
  const book = readMarks();
  const jumpTo = book.marks.find((m) => m.id === query.mark)?.quote ?? null;
  return { props: { text, book, jumpTo } };
};

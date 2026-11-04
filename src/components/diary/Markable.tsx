import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MARK_NAME, publish, rangeAt, TERM_NAME, textNodes } from "src/lib/diaryHighlights";
import { locateQuote, type Mark, type MarkBook } from "src/lib/diaryMarks";

// Text on /dev/diary that can be marked: select words, press the button that
// appears, and they are saved word for word.

const components = {
  // Images point into Obsidian or Notion exports, not at anything this server can show.
  img: ({ alt }: { alt?: string }) => (
    <em className="text-gray-500">[image{alt ? `: ${alt}` : ""}]</em>
  ),
};

export function MarkStyles() {
  return (
    <style>{`
      ::highlight(${MARK_NAME}) { background-color: rgb(250 204 21 / 0.35); }
      ::highlight(${TERM_NAME}) { background-color: rgb(56 189 248 / 0.3); }
    `}</style>
  );
}

export const wholeTextHref = (rel: string, mark?: string) =>
  `/dev/diary/text?rel=${encodeURIComponent(rel)}${mark ? `&mark=${mark}` : ""}`;

export function Markable({
  markdown,
  quotes,
  terms,
  onMark,
  scrollTo,
}: {
  markdown: string;
  quotes: string[];
  terms?: RegExp | null;
  onMark: (quote: string) => void;
  /** A quote to bring into view once rendered. */
  scrollTo?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [button, setButton] = useState<{ top: number; left: number; quote: string } | null>(null);
  const quoteKey = quotes.join("\u0000");
  const termSource = terms?.source;

  // biome-ignore lint/correctness/useExhaustiveDependencies: markdown changes the rendered text nodes this reads
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const owner = el;
    const nodes = textNodes(el);
    const text = nodes.map((n) => n.data).join("");
    const inText = (span: [number, number] | null) => (span ? rangeAt(nodes, ...span) : null);

    const marks = quoteKey
      .split("\u0000")
      .filter(Boolean)
      .flatMap((q) => inText(locateQuote(text, q)) ?? []);
    publish(MARK_NAME, owner, marks);

    const found: Range[] = [];
    if (termSource) {
      for (const match of text.matchAll(new RegExp(termSource, "giu"))) {
        const range = rangeAt(nodes, match.index, match.index + match[0].length);
        if (range) found.push(range);
      }
    }
    publish(TERM_NAME, owner, found);

    if (scrollTo) {
      const target = inText(locateQuote(text, scrollTo))?.startContainer.parentElement;
      target?.scrollIntoView({ block: "center" });
    }
    return () => {
      publish(MARK_NAME, owner, null);
      publish(TERM_NAME, owner, null);
    };
  }, [quoteKey, termSource, markdown, scrollTo]);

  useEffect(() => {
    const hide = () => {
      if (window.getSelection()?.isCollapsed) setButton(null);
    };
    document.addEventListener("selectionchange", hide);
    return () => document.removeEventListener("selectionchange", hide);
  }, []);

  const offer = () => {
    const selection = window.getSelection();
    const el = root.current;
    if (!selection || selection.isCollapsed || !el) return;
    if (!el.contains(selection.anchorNode) || !el.contains(selection.focusNode)) return;
    const quote = selection.toString().trim();
    if (!quote) return;
    const box = selection.getRangeAt(0).getBoundingClientRect();
    setButton({ top: Math.max(box.top - 44, 8), left: box.left, quote });
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: listens for a text selection, not a click
    <div ref={root} onMouseUp={offer} onKeyUp={offer}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
      {button && (
        <button
          type="button"
          className="not-prose fixed z-50 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 dark:text-gray-950"
          style={{ top: button.top, left: button.left }}
          // Keeps the selection alive for the click.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onMark(button.quote);
            window.getSelection()?.removeAllRanges();
            setButton(null);
          }}
        >
          Mark
        </button>
      )}
    </div>
  );
}

export async function sendMarks(body: Record<string, unknown>): Promise<{
  book: MarkBook;
  path?: string;
}> {
  const response = await fetch("/api/dev/diary/marks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${response.status}`);
  return response.json();
}

/** The marks of a file, with a way to take one back. */
export function MarksHere({
  marks,
  onRemove,
  className,
}: {
  marks: Mark[];
  onRemove: (id: string) => void;
  className?: string;
}) {
  if (marks.length === 0) return null;
  return (
    <div className={clsx("not-prose", className)}>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        Marked here · <Link href="/dev/diary/desk">sort on the desk</Link>
      </p>
      <ul className="mt-hair space-y-1 text-sm text-gray-600 dark:text-gray-300">
        {marks.map((mark) => (
          <li key={mark.id} className="flex items-baseline justify-between gap-tight">
            <span className="line-clamp-2">{mark.quote}</span>
            <button
              type="button"
              onClick={() => onRemove(mark.id)}
              className="shrink-0 text-xs text-gray-500 underline hover:text-accent"
            >
              remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

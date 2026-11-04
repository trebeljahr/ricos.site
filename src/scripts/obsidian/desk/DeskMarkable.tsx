import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MARK_NAME, publish, rangeAt, TERM_NAME, textNodes } from "src/lib/diaryHighlights";
import { locateQuote } from "src/lib/diaryMarks";

// Markable text for Desk. It differs from the site's Markable in one way that
// matters on a phone: a touch selection fires no mouseup, so the Mark button
// follows selectionchange, and it acts on pointerdown because tapping anywhere
// else collapses a touch selection first.

const components = {
  // Images point into Obsidian or Notion exports; the reader shows the words.
  img: ({ alt }: { alt?: string }) => (
    <em className="desk-muted">[image{alt ? `: ${alt}` : ""}]</em>
  ),
};

export function DeskMarkable({
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
    publish(
      MARK_NAME,
      owner,
      quoteKey
        .split("\u0000")
        .filter(Boolean)
        .flatMap((q) => inText(locateQuote(text, q)) ?? []),
    );
    const found: Range[] = [];
    if (termSource) {
      for (const match of text.matchAll(new RegExp(termSource, "giu"))) {
        const range = rangeAt(nodes, match.index, match.index + match[0].length);
        if (range) found.push(range);
      }
    }
    publish(TERM_NAME, owner, found);
    if (scrollTo) {
      inText(locateQuote(text, scrollTo))?.startContainer.parentElement?.scrollIntoView({
        block: "center",
      });
    }
    return () => {
      publish(MARK_NAME, owner, null);
      publish(TERM_NAME, owner, null);
    };
  }, [quoteKey, termSource, markdown, scrollTo]);

  useEffect(() => {
    let timer: number | undefined;
    const follow = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const selection = window.getSelection();
        const el = root.current;
        if (!selection || selection.isCollapsed || !el) return setButton(null);
        if (!el.contains(selection.anchorNode) || !el.contains(selection.focusNode)) {
          return setButton(null);
        }
        const quote = selection.toString().trim();
        if (!quote) return setButton(null);
        const box = selection.getRangeAt(0).getBoundingClientRect();
        setButton({ top: Math.max(box.top - 44, 8), left: box.left, quote });
      }, 200);
    };
    document.addEventListener("selectionchange", follow);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("selectionchange", follow);
    };
  }, []);

  const mark = () => {
    if (!button) return;
    onMark(button.quote);
    window.getSelection()?.removeAllRanges();
    setButton(null);
  };

  return (
    <div ref={root} className="desk-text">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </Markdown>
      {/* On body: Obsidian's panes are transformed, which would offset a fixed position. */}
      {button &&
        createPortal(
          <button
            type="button"
            className="desk-mark-button mod-cta"
            style={{ top: button.top, left: button.left }}
            onPointerDown={(event) => {
              event.preventDefault();
              mark();
            }}
            onClick={mark}
          >
            Mark
          </button>,
          document.body,
        )}
    </div>
  );
}

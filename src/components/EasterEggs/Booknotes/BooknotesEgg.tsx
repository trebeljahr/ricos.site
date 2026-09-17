import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import type { RandomQuote } from "src/pages/api/quote";
import { EmojiButton } from "../EmojiButton";
import { clampPageX, PageLayer, pageBox } from "../PageLayer";

const BUBBLE_WIDTH = 320;

type Bubble = RandomQuote & {
  key: number;
  left: number;
  top: number;
  width: number;
  tailX: number;
};

const BooknotesEgg = () => {
  const reduceMotion = useReducedMotion();
  const bookRef = useRef<HTMLSpanElement>(null);
  const loading = useRef<AbortController | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const [bubble, setBubble] = useState<Bubble | null>(null);

  useEffect(
    () => () => {
      loading.current?.abort();
      window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const showQuote = useCallback(async () => {
    if (loading.current || !bookRef.current) return;
    const controller = new AbortController();
    loading.current = controller;
    try {
      const res = await fetch("/api/quote", { signal: controller.signal });
      if (!res.ok) throw new Error(`quote request failed: ${res.status}`);
      const quote = (await res.json()) as RandomQuote;
      if (!quote.content || !bookRef.current) return;

      const book = pageBox(bookRef.current);
      const width = Math.min(BUBBLE_WIDTH, document.documentElement.clientWidth - 24);
      const centerX = book.left + book.width / 2;
      const left = clampPageX(centerX - 40, width);
      setBubble({
        ...quote,
        key: Date.now(),
        left,
        top: book.top + book.height + 14,
        width,
        tailX: Math.max(16, Math.min(width - 16, centerX - left)),
      });

      // Longer quotes stay up longer.
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(
        () => setBubble(null),
        6000 + quote.content.length * 35,
      );
    } catch {
      // A missing quote is not worth an error message; the book just stays closed.
    } finally {
      loading.current = null;
    }
  }, []);

  const registerClick = useEasterEgg("booknotes", { onTrigger: () => void showQuote() });

  return (
    <>
      Booknotes{" "}
      <EmojiButton
        label="Books"
        onClick={() => {
          // While a quote is open, every click swaps in another one.
          if (bubble) void showQuote();
          else registerClick();
        }}
      >
        <motion.span
          ref={bookRef}
          key={bubble ? "open" : "closed"}
          className="inline-block"
          initial={reduceMotion ? false : { scale: 0.7, rotate: bubble ? -8 : 0 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
        >
          {bubble ? "📖" : "📚"}
        </motion.span>
      </EmojiButton>
      <PageLayer>
        <div role="status" aria-live="polite">
          <AnimatePresence mode="wait">
            {bubble && (
              <motion.figure
                key={bubble.key}
                className="absolute m-0 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base font-normal tracking-normal text-gray-900 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                style={{ left: bubble.left, top: bubble.top, width: bubble.width }}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -18, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={
                  reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 260, damping: 22 }
                }
              >
                <span
                  aria-hidden="true"
                  className="absolute -top-[7px] size-3 rotate-45 border-t border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                  style={{ left: bubble.tailX - 6 }}
                />
                <blockquote className="m-0 border-0 p-0 leading-snug">
                  “{bubble.content}”
                </blockquote>
                <figcaption className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {bubble.author}
                </figcaption>
              </motion.figure>
            )}
          </AnimatePresence>
        </div>
      </PageLayer>
    </>
  );
};

export default BooknotesEgg;

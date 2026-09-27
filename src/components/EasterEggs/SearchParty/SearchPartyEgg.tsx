import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { PaintCanvas, type PaintHandle } from "./PaintCanvas";

/** Pages hiding under the paint, in no particular order. */
const HIDDEN_PAGES = ["/quotes", "/timeline", "/art", "/photography", "/eggs"];
/** A link counts as uncovered once this little paint is left over it. */
const CLEAR_ENOUGH = 0.45;
/** Below this much paint on the screen, the bucket is worth offering again. */
const WIPED = 0.02;
/** And it stays out until this much of the page is under paint once more, so
    one bucket is never enough: it takes a few to cover the page again. */
const REPAINTED = 0.82;
const KEY_STEP = 44;
const HINT_AFTER_MS = 5000;

type Spot = { fx: number; fy: number };

/** One hiding place per page, spread over the field below the text. */
function scatter(): Spot[] {
  return HIDDEN_PAGES.map((_, i) => ({
    fx: (i % 2 === 0 ? 0.06 : 0.48) + Math.random() * 0.18,
    fy: 0.06 + (0.88 * (i + 0.2 + Math.random() * 0.6)) / HIDDEN_PAGES.length,
  }));
}

/**
 * Easter egg on the 404 page: paint covers the window, the navbar and the
 * footer with it, and the pointer wipes it off. Whatever the cloth uncovers is
 * simply there — the heading, the text, the five links hiding in the field.
 * Wipe the last of it away and the bucket turns up, to tip over the page again.
 */
const SearchPartyEgg = () => {
  const reduceMotion = useReducedMotion();
  const recordFind = useRecordEggFind();
  const paintRef = useRef<PaintHandle | null>(null);
  const chipRefs = useRef<(HTMLElement | null)[]>([]);
  const leftRef = useRef(1);
  const recordedRef = useRef(false);
  const scrollRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [spots, setSpots] = useState(scatter);
  const [revealed, setRevealed] = useState<boolean[]>(() => HIDDEN_PAGES.map(() => false));
  const [wiped, setWiped] = useState(false);
  const [swept, setSwept] = useState(false);
  // Without a canvas there is nothing to wipe: the links are simply there.
  const [painting, setPainting] = useState(true);
  const [showHint, setShowHint] = useState(false);

  const count = revealed.filter(Boolean).length;
  const shown = (i: number) => revealed[i] || !painting;

  useEffect(() => setMounted(true), []);

  // Someone who has not touched the paint for a while gets told what it is for.
  useEffect(() => {
    if (swept) return;
    const timer = window.setTimeout(() => setShowHint(true), HINT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [swept]);

  /** Reads which links the paint has come off, and whether any is left at all. */
  const check = useCallback((left: number) => {
    leftRef.current = left;
    const paint = paintRef.current;
    const next = chipRefs.current.map((chip) =>
      chip ? paint!.paintOver(chip.getBoundingClientRect()) < CLEAR_ENOUGH : false,
    );
    // Same answer, same array: the page only re-renders on a real change.
    setRevealed((was) => (next.some((now, i) => now !== was[i]) ? next : was));
    setWiped((was) => (was ? left < REPAINTED : left < WIPED));
  }, []);

  useEffect(() => {
    if (recordedRef.current || !painting || count < HIDDEN_PAGES.length) return;
    recordedRef.current = true;
    recordFind("search-party");
  }, [count, painting, recordFind]);

  /** The paint sits on the window, so scrolling moves the page under it. */
  useEffect(() => {
    const onScroll = () => {
      if (scrollRef.current) return;
      scrollRef.current = window.requestAnimationFrame(() => {
        scrollRef.current = 0;
        if (paintRef.current) check(leftRef.current);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(scrollRef.current);
    };
  }, [check]);

  const wipe = useCallback((x: number, y: number) => {
    paintRef.current?.wipe(x, y);
    setSwept(true);
    setShowHint(false);
  }, []);

  // The paint lies over the whole page, so the page keeps the pointer and the
  // clicks, and the wipe is read from the window instead.
  useEffect(() => {
    const move = (event: PointerEvent) => wipe(event.clientX, event.clientY);
    const lift = () => paintRef.current?.lift();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointercancel", lift);
    window.addEventListener("pointerup", lift);
    document.addEventListener("pointerleave", lift);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointercancel", lift);
      window.removeEventListener("pointerup", lift);
      document.removeEventListener("pointerleave", lift);
    };
  }, [wipe]);

  /** Keyboard wiping: the arrow keys rub the cloth across the screen. */
  useEffect(() => {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const at = { x: innerWidth / 2, y: innerHeight / 2 };
    const rub = (event: KeyboardEvent) => {
      const step = steps[event.key];
      if (!step || event.target !== document.body) return;
      const size = event.shiftKey ? KEY_STEP * 2 : KEY_STEP;
      at.x = Math.max(0, Math.min(at.x + step[0] * size, innerWidth));
      at.y = Math.max(0, Math.min(at.y + step[1] * size, innerHeight));
      wipe(at.x, at.y);
      event.preventDefault();
    };
    window.addEventListener("keydown", rub);
    return () => window.removeEventListener("keydown", rub);
  }, [wipe]);

  /** Tips the bucket over the page again and hides the links somewhere else.
      Each tip lands somewhere else, so it takes a few to cover the page. */
  const tipOver = () => {
    paintRef.current?.lift();
    paintRef.current?.splash(
      innerWidth * (0.18 + Math.random() * 0.64),
      innerHeight * (0.18 + Math.random() * 0.64),
    );
    setSpots(scatter());
    setSwept(false);
  };

  return (
    <>
      {/* The field the links hide in. It sits in the page, so they scroll with
          the text and never end up over the footer. */}
      <div className="relative mt-8 h-[60vh] min-h-96">
        {HIDDEN_PAGES.map((href, i) => (
          <div
            key={href}
            ref={(el) => {
              chipRefs.current[i] = el;
            }}
            className="absolute"
            style={{
              left: `${spots[i].fx * 100}%`,
              top: `${spots[i].fy * 100}%`,
              // Still under paint: nothing to click on by accident either.
              pointerEvents: shown(i) ? undefined : "none",
            }}
          >
            <motion.span
              className="inline-block"
              animate={revealed[i] ? { scale: [1.12, 0.99, 1] } : { scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.42 }}
            >
              <Link
                href={href}
                tabIndex={shown(i) ? undefined : -1}
                aria-hidden={shown(i) ? undefined : true}
                className="rounded-full border border-dashed border-accent bg-white/90 px-2.5 py-1 font-mono text-sm text-accent no-underline shadow-sm hover:border-solid dark:bg-gray-900/90"
              >
                {href}
              </Link>
            </motion.span>
          </div>
        ))}
      </div>

      {mounted &&
        createPortal(
          // Click-through: the page underneath keeps its clicks and its scrolling.
          <div
            className="pointer-events-none fixed inset-0 overflow-hidden"
            style={{ zIndex: 1000 }}
          >
            <PaintCanvas
              handleRef={paintRef}
              onCoverage={check}
              onReady={setPainting}
              calm={!!reduceMotion}
            />

            {showHint && painting && (
              <span className="absolute inset-x-0 bottom-16 text-center text-xs tracking-wide text-gray-500 dark:text-gray-400">
                something is under the paint
              </span>
            )}
            {count > 0 && painting && !wiped && (
              <span className="absolute right-5 bottom-5 text-xs text-gray-500 dark:text-gray-400">
                {count} of {HIDDEN_PAGES.length} found
              </span>
            )}

            {/* The last of the paint gone, the bucket is all that is left. */}
            {wiped && painting && (
              <motion.button
                type="button"
                onClick={tipOver}
                initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileTap={reduceMotion ? undefined : { scale: 0.88, rotate: -18 }}
                transition={{ duration: reduceMotion ? 0 : 0.32 }}
                aria-label="Tip the bucket over the page again"
                className="pointer-events-auto absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer rounded-full border border-dashed border-gray-400 bg-white/80 px-4 py-2 text-2xl backdrop-blur-sm hover:border-accent dark:border-gray-600 dark:bg-gray-900/80"
              >
                <span aria-hidden>🪣</span>
              </motion.button>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default SearchPartyEgg;

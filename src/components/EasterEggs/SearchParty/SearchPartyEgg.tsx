import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { type Point, SmokeCanvas } from "./SmokeCanvas";

/** Pages hiding in the smoke, in no particular order. */
const HIDDEN_PAGES = [
  "/quotes",
  "/timeline",
  "/art",
  "/photography",
  "/posts",
  "/booknotes",
  "/newsletters",
  "/projects",
  "/categories",
  "/start-here",
  "/midjourney",
  "/eggs",
];
/** Everything the sweep can pull out of the smoke and leave standing. */
const STICKY = "main h1, main [data-smoke-stick]";
/** How close the sweep has to pass for something to count as found. */
const REACH = 66;
const KEY_STEP = 48;
const HINT_AFTER_MS = 5000;
/** Under the navbar (z-999) and the footer, which stay out of the weather. */
const SMOKE_Z = 40;
/** Columns the hiding places are dealt into. A phone has room for fewer. */
const columns = () => (typeof window !== "undefined" && window.innerWidth < 640 ? 2 : 3);

type Spot = { fx: number; fy: number };

/** A hiding place per page: one to a cell of a loose grid, in any order, and
    nowhere near the middle of its cell, so the field looks scattered. */
function scatter(): Spot[] {
  const cols = columns();
  const rows = Math.ceil(HIDDEN_PAGES.length / cols);
  const cells = [...Array(cols * rows).keys()];
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return HIDDEN_PAGES.map((_, i) => {
    const cell = cells[i];
    return {
      fx: Math.min(0.8, ((cell % cols) + 0.08 + Math.random() * 0.6) / cols),
      fy: (Math.floor(cell / cols) + 0.18 + Math.random() * 0.5) / rows,
    };
  });
}

/**
 * Easter egg on the 404 page: smoke hangs over the page and stays there. It
 * is not worth trying to peer through — nothing shows until the opening that
 * trails the pointer passes over it. Whatever that opening finds — the
 * heading, a line of text, one of the hidden links — the cloud holds open
 * from then on. The navbar and the footer are above the weather, so there is
 * always a way off the page. The last of the hidden links is the egg list.
 */
const SearchPartyEgg = () => {
  const reduceMotion = useReducedMotion();
  const recordFind = useRecordEggFind();
  const pointerRef = useRef<Point | null>(null);
  const chipRefs = useRef<(HTMLElement | null)[]>([]);
  const stickyRef = useRef<HTMLElement[]>([]);
  // What the cloud is holding open, handed to the canvas to cut out each frame.
  const clearRef = useRef<HTMLElement[]>([]);
  const foundRef = useRef<boolean[]>(HIDDEN_PAGES.map(() => false));
  const [mounted, setMounted] = useState(false);
  const [spots, setSpots] = useState(scatter);
  const [found, setFound] = useState<boolean[]>(() => HIDDEN_PAGES.map(() => false));
  const [swept, setSwept] = useState(false);
  // Without a cloud there is nothing to search: the links are simply there.
  const [smoking, setSmoking] = useState(true);
  const [showHint, setShowHint] = useState(false);

  const shown = (i: number) => found[i] || !smoking;

  useEffect(() => {
    setMounted(true);
    // Finding the page at all is what earns it. The five links are for fun.
    recordFind("search-party");
    // The heading and the text belong to the page, so they are picked up from it.
    stickyRef.current = [...document.querySelectorAll<HTMLElement>(STICKY)];
    // The footer sits in the flow with no stacking of its own, so the cloud
    // would cover it. The navbar is already above it at z-999.
    const footer = document.querySelector<HTMLElement>("body footer");
    if (footer) footer.style.zIndex = String(SMOKE_Z + 1);
    return () => {
      if (footer) footer.style.zIndex = "";
    };
  }, [recordFind]);

  // Someone who has not stirred the smoke for a while gets told what it is for.
  useEffect(() => {
    if (swept) return;
    const timer = window.setTimeout(() => setShowHint(true), HINT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [swept]);

  /** Opens the cloud over a piece of the page for good, with a snap. Nothing
      is lifted above the smoke: the smoke is cut away over it instead, so the
      page keeps its own stacking and the navbar stays on top of the text. */
  const stick = useCallback(
    (el: HTMLElement) => {
      el.dataset.smokeFound = "";
      clearRef.current = [...clearRef.current, el];
      if (reduceMotion) return;
      el.animate([{ scale: "1.03" }, { scale: "0.997" }, { scale: "1" }], {
        duration: 420,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      });
    },
    [reduceMotion],
  );

  /** Picks up whatever the opening is over. Sets state only on a new find. */
  const pickUp = useCallback(
    (x: number, y: number) => {
      const covers = (el: Element | null, reach: number) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const nearestX = Math.max(r.left, Math.min(x, r.right));
        const nearestY = Math.max(r.top, Math.min(y, r.bottom));
        return Math.hypot(x - nearestX, y - nearestY) <= reach;
      };

      for (const el of stickyRef.current) {
        if (el.dataset.smokeFound === undefined && covers(el, REACH * 0.5)) {
          stick(el);
        }
      }

      if (foundRef.current.every(Boolean)) return;
      const hits = chipRefs.current.map((chip, i) => !foundRef.current[i] && covers(chip, REACH));
      if (!hits.some(Boolean)) return;

      const opened = chipRefs.current.filter((chip, i) => chip && hits[i]) as HTMLElement[];
      clearRef.current = [...clearRef.current, ...opened];
      foundRef.current = foundRef.current.map((was, i) => was || hits[i]);
      setFound(foundRef.current);
    },
    [stick],
  );

  const aim = useCallback(
    (x: number, y: number) => {
      pointerRef.current = { x, y };
      // Picked up from the pointer as well as from the trailing opening, so a
      // quick sweep never skips something the pointer went straight over.
      pickUp(x, y);
      setSwept(true);
      setShowHint(false);
    },
    [pickUp],
  );

  // The smoke lies over the whole page, so the page keeps the pointer and the
  // clicks, and the sweep is read from the window instead.
  useEffect(() => {
    const move = (event: PointerEvent) => aim(event.clientX, event.clientY);
    const away = () => {
      pointerRef.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointercancel", away);
    document.addEventListener("pointerleave", away);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointercancel", away);
      document.removeEventListener("pointerleave", away);
    };
  }, [aim]);

  /** Keyboard fanning: the arrow keys walk the opening across the screen. */
  useEffect(() => {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const fan = (event: KeyboardEvent) => {
      const step = steps[event.key];
      if (!step || event.target !== document.body) return;
      const from = pointerRef.current ?? { x: innerWidth / 2, y: innerHeight / 2 };
      const size = event.shiftKey ? KEY_STEP * 2 : KEY_STEP;
      aim(
        Math.max(0, Math.min(from.x + step[0] * size, innerWidth)),
        Math.max(0, Math.min(from.y + step[1] * size, innerHeight)),
      );
      event.preventDefault();
    };
    window.addEventListener("keydown", fan);
    return () => window.removeEventListener("keydown", fan);
  }, [aim]);

  return (
    <>
      {/* The field the links hide in. It sits in the page, so they scroll with
          the text and never end up over the footer. */}
      <div className="relative mt-8 h-[115vh] min-h-[780px]">
        {HIDDEN_PAGES.map((href, i) => (
          <div
            key={href}
            ref={(el) => {
              chipRefs.current[i] = el;
            }}
            className="absolute"
            style={{
              // Held off the right edge, so the longer names still fit on a phone.
              left: `min(${spots[i].fx * 100}%, calc(100% - 8rem))`,
              top: `${spots[i].fy * 100}%`,
            }}
          >
            <motion.span
              className="inline-block"
              animate={found[i] ? { scale: [1.12, 0.99, 1] } : { scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.42 }}
            >
              <Link
                href={href}
                tabIndex={shown(i) ? undefined : -1}
                aria-hidden={shown(i) ? undefined : true}
                className={
                  shown(i)
                    ? "rounded-full border border-dashed border-accent bg-white/90 px-2 py-0.5 font-mono text-xs text-accent no-underline shadow-sm hover:border-solid sm:px-2.5 sm:py-1 sm:text-sm dark:bg-gray-900/90"
                    : "rounded-full border border-dashed border-gray-500 px-2 py-0.5 font-mono text-xs text-gray-600 no-underline sm:px-2.5 sm:py-1 sm:text-sm dark:border-gray-400 dark:text-gray-200"
                }
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
            style={{ zIndex: SMOKE_Z }}
          >
            <SmokeCanvas
              pointerRef={pointerRef}
              onFocus={pickUp}
              clearRef={clearRef}
              calm={!!reduceMotion}
              onReady={setSmoking}
            />

            {showHint && smoking && (
              <span className="absolute inset-x-0 bottom-16 text-center text-xs tracking-wide text-gray-500 dark:text-gray-400">
                something is in the smoke
              </span>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default SearchPartyEgg;

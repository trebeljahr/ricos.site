import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";

/** Pages hiding in the fog below the text. */
const HIDDEN_PAGES = ["/quotes", "/timeline", "/art", "/photography", "/eggs"];
/** Radius of the glass, and of the hole it clears in the fog. */
const LENS_R = 62;
/** How close the glass has to pass for a link to count as found. */
const REACH = LENS_R * 0.8;
const KEY_STEP = 28;
const HINT_AFTER_MS = 3500;

type Spot = { fx: number; fy: number };
type Point = { x: number; y: number };

/** One hiding place per page, in bands down the fog, alternating sides. */
function scatter(): Spot[] {
  return HIDDEN_PAGES.map((_, i) => ({
    fx: (i % 2 === 0 ? 0.08 : 0.48) + Math.random() * 0.14,
    // Inside the middle 84% of the fog, so the glass never has to leave it.
    fy: 0.08 + (0.84 * (i + 0.25 + Math.random() * 0.5)) / HIDDEN_PAGES.length,
  }));
}

/** Keeps the whole glass inside the fog, never half-clipped by its edge. */
const clamp = (value: number, max: number) =>
  max < LENS_R * 2 ? max / 2 : Math.max(LENS_R, Math.min(value, max - LENS_R));

/** True when the glass at `lens` covers any part of `rect`. */
function within(lens: Point, rect: { x: number; y: number; width: number; height: number }) {
  const nearestX = Math.max(rect.x, Math.min(lens.x, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(lens.y, rect.y + rect.height));
  return Math.hypot(lens.x - nearestX, lens.y - nearestY) <= REACH;
}

/**
 * Easter egg on the 404 page: the empty space below the text fogs over, and the
 * magnifying glass is a real object you drag across it. The fog clears inside
 * the glass, so links that were only blurry smudges become readable, and every
 * one the glass passes over stays. The last of them is the list of eggs itself.
 */
const SearchPartyEgg = ({ searchArea }: { searchArea: RefObject<HTMLElement | null> }) => {
  const reduceMotion = useReducedMotion();
  const recordFind = useRecordEggFind();
  const fieldRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLElement | null)[]>([]);
  const foundRef = useRef<boolean[]>(HIDDEN_PAGES.map(() => false));
  const [mounted, setMounted] = useState(false);
  const [spots] = useState(scatter);
  const [searching, setSearching] = useState(false);
  const [lens, setLens] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const [swept, setSwept] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [found, setFound] = useState<boolean[]>(() => HIDDEN_PAGES.map(() => false));

  const count = found.filter(Boolean).length;
  const cleared = count === HIDDEN_PAGES.length;

  // The fog lives inside the empty block on the page, so it scrolls and
  // reflows with it instead of being pinned to document coordinates.
  useEffect(() => setMounted(true), []);

  // "Drag me", but only for someone who picks the glass up and then stalls.
  useEffect(() => {
    if (!searching || swept) return;
    const timer = window.setTimeout(() => setShowHint(true), HINT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [searching, swept]);

  // Every move of the glass uncovers whatever it passes over.
  useEffect(() => {
    const field = fieldRef.current;
    if (!lens || !field) return;
    const box = field.getBoundingClientRect();
    const hits = chipRefs.current.map((chip, i) => {
      if (foundRef.current[i] || !chip) return false;
      const r = chip.getBoundingClientRect();
      return within(lens, {
        x: r.left - box.left,
        y: r.top - box.top,
        width: r.width,
        height: r.height,
      });
    });
    if (!hits.some(Boolean)) return;

    foundRef.current = foundRef.current.map((was, i) => was || hits[i]);
    setFound(foundRef.current);
    if (foundRef.current.every(Boolean)) recordFind("search-party");
  }, [lens, recordFind]);

  const start = () => {
    const field = fieldRef.current;
    setSearching(true);
    if (!field || lens) return;
    const box = field.getBoundingClientRect();
    const hiding = spots.map((spot) => ({ x: spot.fx * box.width, y: spot.fy * box.height }));
    // Park the glass where it gives nothing away: the spot of the five candidates
    // that is furthest from every hiding place.
    const candidates = [
      { x: box.width / 2, y: box.height / 2 },
      { x: box.width * 0.2, y: box.height * 0.2 },
      { x: box.width * 0.8, y: box.height * 0.2 },
      { x: box.width * 0.2, y: box.height * 0.8 },
      { x: box.width * 0.8, y: box.height * 0.8 },
    ];
    const clearest = candidates.reduce((best, candidate) => {
      const gap = (point: Point) =>
        Math.min(...hiding.map((spot) => Math.hypot(point.x - spot.x, point.y - spot.y)));
      return gap(candidate) > gap(best) ? candidate : best;
    });
    setLens({ x: clamp(clearest.x, box.width), y: clamp(clearest.y, box.height) });
  };

  const moveTo = useCallback((clientX: number, clientY: number) => {
    const field = fieldRef.current;
    if (!field) return;
    const box = field.getBoundingClientRect();
    setLens({ x: clamp(clientX - box.left, box.width), y: clamp(clientY - box.top, box.height) });
  }, []);

  // The glass follows the pointer anywhere over the fog, so a sweep can start
  // on the glass or beside it, and it keeps up when the pointer runs outside.
  const grab = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(true);
    setSwept(true);
    setShowHint(false);
    moveTo(event.clientX, event.clientY);
  };

  /** On the fog itself, only a mouse or pen grabs: a finger there scrolls the page. */
  const grabWithPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch") grab(event);
  };

  useEffect(() => {
    if (!dragging) return;
    const move = (event: PointerEvent) => moveTo(event.clientX, event.clientY);
    const stop = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, [dragging, moveTo]);

  const nudge = (dx: number, dy: number) => {
    const field = fieldRef.current;
    if (!field || !lens) return;
    const box = field.getBoundingClientRect();
    setSwept(true);
    setShowHint(false);
    setLens({ x: clamp(lens.x + dx, box.width), y: clamp(lens.y + dy, box.height) });
  };

  // Black keeps the fog, transparent takes it away: a soft-edged hole under the glass.
  const hole =
    lens && !cleared
      ? `radial-gradient(circle ${LENS_R}px at ${lens.x}px ${lens.y}px, transparent 0, transparent ${LENS_R - 12}px, #000 ${LENS_R}px)`
      : undefined;

  const field = (
    <div
      ref={fieldRef}
      className={`absolute inset-0 overflow-hidden rounded-2xl ${
        searching && !cleared ? "ring-1 ring-gray-300/60 dark:ring-gray-700/60" : ""
      }`}
      onPointerDown={searching && !cleared ? grabWithPointer : undefined}
    >
      {/* Nothing is hidden here until the glass comes out, so the page stays plain.
          A found link moves above the fog and stays readable from then on. */}
      {searching &&
        HIDDEN_PAGES.map((href, i) => (
          <div
            key={href}
            ref={(el) => {
              chipRefs.current[i] = el;
            }}
            className={`absolute ${found[i] ? "z-20" : "z-0"}`}
            style={{ left: `${spots[i].fx * 100}%`, top: `${spots[i].fy * 100}%` }}
          >
            <motion.span
              className="inline-block"
              animate={found[i] ? { scale: [1, 1.18, 1] } : { scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.45 }}
            >
              <Link
                href={href}
                tabIndex={found[i] ? undefined : -1}
                aria-hidden={found[i] ? undefined : true}
                className={
                  found[i]
                    ? "rounded-full border border-dashed border-accent bg-white px-2.5 py-1 font-mono text-sm text-accent no-underline shadow-sm hover:border-solid dark:bg-gray-900"
                    : "rounded-full border border-dashed border-gray-400 px-2.5 py-1 font-mono text-sm text-gray-600 no-underline dark:border-gray-600 dark:text-gray-400"
                }
              >
                {href}
              </Link>
            </motion.span>
          </div>
        ))}

      {/* The fog itself. Everything under it is blurred until the glass passes. */}
      <AnimatePresence>
        {searching && !cleared && (
          <motion.div
            key="fog"
            aria-hidden="true"
            className="absolute inset-0 z-10 bg-slate-200/75 backdrop-blur-[7px] dark:bg-slate-600/55"
            style={{ maskImage: hole, WebkitMaskImage: hole }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.2 : 0.8 } }}
            transition={{ duration: reduceMotion ? 0.2 : 0.6 }}
          >
            <span className="absolute -top-10 left-[12%] h-48 w-64 rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.35),transparent_70%)]" />
            <span className="absolute bottom-0 right-[8%] h-56 w-72 rounded-full bg-[radial-gradient(circle,rgba(148,163,184,0.3),transparent_70%)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {searching && lens && (
        <>
          <AnimatePresence>
            {!cleared && (
              <motion.button
                type="button"
                aria-label="Magnifying glass, drag it across the fog"
                className={`absolute z-30 touch-none rounded-full border-4 border-gray-700 bg-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.25),inset_0_0_24px_rgba(255,255,255,0.35)] dark:border-gray-200 ${
                  dragging ? "cursor-grabbing" : "cursor-grab"
                } ${!swept ? "motion-safe:animate-egg-search" : ""}`}
                style={{
                  left: lens.x - LENS_R,
                  top: lens.y - LENS_R,
                  width: LENS_R * 2,
                  height: LENS_R * 2,
                }}
                onPointerDown={grab}
                onKeyDown={(e) => {
                  const step = e.shiftKey ? KEY_STEP * 3 : KEY_STEP;
                  if (e.key === "ArrowLeft") nudge(-step, 0);
                  else if (e.key === "ArrowRight") nudge(step, 0);
                  else if (e.key === "ArrowUp") nudge(0, -step);
                  else if (e.key === "ArrowDown") nudge(0, step);
                  else return;
                  e.preventDefault();
                }}
                exit={{
                  rotate: reduceMotion ? 0 : 375,
                  opacity: 0,
                  transition: { duration: reduceMotion ? 0.3 : 1.1, ease: "easeOut" },
                }}
                transition={{ type: "spring", stiffness: 160, damping: 18 }}
              >
                {/* The handle, and a glint so the circle reads as glass. */}
                <span
                  aria-hidden="true"
                  className="absolute -right-5 -bottom-5 h-10 w-3 origin-top rotate-[-45deg] rounded-full bg-gray-700 dark:bg-gray-200"
                />
                <span
                  aria-hidden="true"
                  className="absolute top-4 left-5 h-6 w-10 -rotate-[25deg] rounded-full bg-white/50 blur-[2px]"
                />
              </motion.button>
            )}
          </AnimatePresence>
          {showHint && !cleared && (
            <span
              className="pointer-events-none absolute z-30 text-xs text-gray-500 dark:text-gray-400"
              style={{ left: lens.x - 24, top: lens.y + LENS_R + 10 }}
            >
              drag me
            </span>
          )}
        </>
      )}

      {searching && count > 0 && (
        <span className="absolute right-3 bottom-2 z-30 text-xs text-gray-500 dark:text-gray-400">
          {count} of {HIDDEN_PAGES.length} found
        </span>
      )}
    </div>
  );

  return (
    <>
      404 - Page Not Found{" "}
      <EmojiButton label="Magnifying glass" onClick={start}>
        {cleared ? "🔎" : "🔍"}
      </EmojiButton>
      {mounted && searchArea.current && createPortal(field, searchArea.current)}
    </>
  );
};

export default SearchPartyEgg;

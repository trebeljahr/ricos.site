import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { type Point, SmokeCanvas } from "./SmokeCanvas";

/** Pages hiding in the smoke, in no particular order. */
const HIDDEN_PAGES = ["/quotes", "/timeline", "/art", "/photography", "/eggs"];
/** How close the pointer has to pass for a link to count as found. */
const REACH = 64;
const KEY_STEP = 48;
const HINT_AFTER_MS = 5000;

type Spot = { fx: number; fy: number };

/** One hiding place per page, spread over the lower half of the screen. */
function scatter(): Spot[] {
  return HIDDEN_PAGES.map((_, i) => ({
    fx: (i % 2 === 0 ? 0.08 : 0.52) + Math.random() * 0.16,
    fy: 0.46 + (0.46 * (i + 0.2 + Math.random() * 0.6)) / HIDDEN_PAGES.length,
  }));
}

/**
 * Easter egg on the 404 page: the whole screen is full of smoke, with the page
 * itself behind it and five links hidden in it. The pointer parts the smoke a
 * beat behind itself, light comes through where it thins and the blur lifts
 * with it, so the heading, the text and a link at a time become readable. The
 * smoke rolls back in; whatever the sweep touched stays out of it. The last of
 * the five is the list of easter eggs itself.
 */
const SearchPartyEgg = () => {
  const reduceMotion = useReducedMotion();
  const recordFind = useRecordEggFind();
  const skyRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<Point | null>(null);
  const chipRefs = useRef<(HTMLElement | null)[]>([]);
  const foundRef = useRef<boolean[]>(HIDDEN_PAGES.map(() => false));
  const [mounted, setMounted] = useState(false);
  const [spots] = useState(scatter);
  const [found, setFound] = useState<boolean[]>(() => HIDDEN_PAGES.map(() => false));
  const [swept, setSwept] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const count = found.filter(Boolean).length;
  const lifted = count === HIDDEN_PAGES.length;

  useEffect(() => setMounted(true), []);

  // Someone who has not stirred the smoke for a while gets told what it is for.
  useEffect(() => {
    if (swept) return;
    const timer = window.setTimeout(() => setShowHint(true), HINT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [swept]);

  /** Picks up whatever is at this point of the screen. Sets state only on a new find. */
  const pickUp = (x: number, y: number) => {
    if (lifted) return;
    const hits = chipRefs.current.map((chip, i) => {
      if (foundRef.current[i] || !chip) return false;
      const r = chip.getBoundingClientRect();
      const nearestX = Math.max(r.left, Math.min(x, r.right));
      const nearestY = Math.max(r.top, Math.min(y, r.bottom));
      return Math.hypot(x - nearestX, y - nearestY) <= REACH;
    });
    if (!hits.some(Boolean)) return;

    foundRef.current = foundRef.current.map((was, i) => was || hits[i]);
    setFound(foundRef.current);
    if (foundRef.current.every(Boolean)) recordFind("search-party");
  };

  const aim = (x: number, y: number) => {
    pointerRef.current = { x, y };
    // Picked up from the pointer as well as from the trailing focus, so a quick
    // sweep never skips a link the pointer went straight over.
    pickUp(x, y);
    if (swept) return;
    setSwept(true);
    setShowHint(false);
  };

  // The smoke lies over the whole page, so the page keeps the pointer and the
  // clicks, and the sweep is read from the window instead.
  useEffect(() => {
    if (lifted) return;
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
  });

  /** Keyboard fanning: the arrow keys walk the focus across the screen. */
  useEffect(() => {
    if (lifted) return;
    const fan = (event: KeyboardEvent) => {
      const steps: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const step = steps[event.key];
      if (!step || event.target !== document.body) return;
      const from = pointerRef.current ?? {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
      const size = event.shiftKey ? KEY_STEP * 2 : KEY_STEP;
      aim(
        Math.max(0, Math.min(from.x + step[0] * size, window.innerWidth)),
        Math.max(0, Math.min(from.y + step[1] * size, window.innerHeight)),
      );
      event.preventDefault();
    };
    window.addEventListener("keydown", fan);
    return () => window.removeEventListener("keydown", fan);
  });

  if (!mounted) return null;

  return createPortal(
    // Click-through: the page underneath keeps working while the smoke hangs over it.
    <div
      ref={skyRef}
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden [--smoke-glow:rgba(255,255,255,0.98)] dark:[--smoke-glow:rgba(170,205,255,0.72)]"
    >
      {/* Light behind the smoke, brightest where it is thinnest. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 transition-opacity duration-1000"
        style={{
          opacity: lifted ? 0 : 1,
          background:
            "radial-gradient(circle calc(var(--focus-r, 0px) * 1.5) at var(--focus-x, 50%) var(--focus-y, 50%), var(--smoke-glow), transparent 70%)",
        }}
      />

      {/* The page is out of focus everywhere except under the moving hole. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 backdrop-blur-[7px] transition-opacity duration-1000"
        style={{
          opacity: lifted ? 0 : 1,
          maskImage:
            "radial-gradient(circle var(--focus-r, 0px) at var(--focus-x, 50%) var(--focus-y, 50%), transparent 0, transparent 45%, #000 100%)",
          WebkitMaskImage:
            "radial-gradient(circle var(--focus-r, 0px) at var(--focus-x, 50%) var(--focus-y, 50%), transparent 0, transparent 45%, #000 100%)",
        }}
      />

      <SmokeCanvas
        pointerRef={pointerRef}
        varsRef={skyRef}
        onFocus={pickUp}
        lifted={lifted}
        calm={!!reduceMotion}
      />

      {HIDDEN_PAGES.map((href, i) => (
        <div
          key={href}
          ref={(el) => {
            chipRefs.current[i] = el;
          }}
          className={`absolute ${found[i] ? "z-20" : "z-1"}`}
          style={{ left: `${spots[i].fx * 100}%`, top: `${spots[i].fy * 100}%` }}
        >
          <motion.span
            className="inline-block"
            animate={found[i] ? { scale: [1, 1.18, 1] } : { scale: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.5 }}
          >
            <Link
              href={href}
              tabIndex={found[i] ? undefined : -1}
              aria-hidden={found[i] ? undefined : true}
              className={
                found[i]
                  ? "pointer-events-auto rounded-full border border-dashed border-accent bg-white/90 px-2.5 py-1 font-mono text-sm text-accent no-underline shadow-sm hover:border-solid dark:bg-gray-900/90"
                  : "rounded-full border border-dashed border-gray-500 px-2.5 py-1 font-mono text-sm text-gray-600 no-underline dark:border-gray-400 dark:text-gray-200"
              }
            >
              {href}
            </Link>
          </motion.span>
        </div>
      ))}

      {showHint && !lifted && (
        <span className="absolute inset-x-0 bottom-16 z-20 text-center text-xs tracking-wide text-gray-500 dark:text-gray-400">
          something is in the smoke
        </span>
      )}
      {count > 0 && (
        // Counts up while the smoke is there, then goes with it.
        <span
          className="absolute right-5 bottom-5 z-20 text-xs text-gray-500 transition-opacity duration-1000 dark:text-gray-400"
          style={{ opacity: lifted ? 0 : 1 }}
        >
          {count} of {HIDDEN_PAGES.length} found
        </span>
      )}
    </div>,
    document.body,
  );
};

export default SearchPartyEgg;

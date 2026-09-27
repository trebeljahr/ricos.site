import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { type Point, SmokeCanvas } from "./SmokeCanvas";

/** Pages hiding in the smoke below the text. */
const HIDDEN_PAGES = ["/quotes", "/timeline", "/art", "/photography", "/eggs"];
/** How close the focus has to pass for a link to count as found. */
const REACH = 64;
const KEY_STEP = 44;
const HINT_AFTER_MS = 5000;

type Spot = { fx: number; fy: number };

/** One hiding place per page, in bands down the cloud, alternating sides. */
function scatter(): Spot[] {
  return HIDDEN_PAGES.map((_, i) => ({
    fx: (i % 2 === 0 ? 0.1 : 0.5) + Math.random() * 0.14,
    fy: 0.1 + (0.8 * (i + 0.25 + Math.random() * 0.5)) / HIDDEN_PAGES.length,
  }));
}

/**
 * Easter egg on the 404 page: the empty space below the text is a cloud of
 * smoke with links somewhere inside it. The smoke thins where the pointer
 * goes, a beat behind it, and the blur lifts with it, so a smudge becomes a
 * readable link. Whatever the sweep passes stays out of the smoke for good.
 * The last of the five is the list of easter eggs itself.
 */
const SearchPartyEgg = () => {
  const reduceMotion = useReducedMotion();
  const recordFind = useRecordEggFind();
  const fieldRef = useRef<HTMLElement>(null);
  const pointerRef = useRef<Point | null>(null);
  const chipRefs = useRef<(HTMLElement | null)[]>([]);
  const foundRef = useRef<boolean[]>(HIDDEN_PAGES.map(() => false));
  const [spots] = useState(scatter);
  const [found, setFound] = useState<boolean[]>(() => HIDDEN_PAGES.map(() => false));
  const [swept, setSwept] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const count = found.filter(Boolean).length;
  const lifted = count === HIDDEN_PAGES.length;

  /** Picks up whatever the focus is over. Runs every frame, so it never sets state for nothing. */
  const pickUp = (x: number, y: number) => {
    const field = fieldRef.current;
    if (!field || lifted) return;
    const box = field.getBoundingClientRect();
    const hits = chipRefs.current.map((chip, i) => {
      if (foundRef.current[i] || !chip) return false;
      const r = chip.getBoundingClientRect();
      const nearestX = Math.max(r.left - box.left, Math.min(x, r.right - box.left));
      const nearestY = Math.max(r.top - box.top, Math.min(y, r.bottom - box.top));
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

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    aim(event.clientX - box.left, event.clientY - box.top);
  };

  /** Keyboard fanning: the arrow keys walk the focus through the cloud. */
  const fan = (dx: number, dy: number) => {
    const field = fieldRef.current;
    if (!field) return;
    const box = field.getBoundingClientRect();
    const from = pointerRef.current ?? { x: box.width / 2, y: box.height / 2 };
    aim(
      Math.max(0, Math.min(from.x + dx, box.width)),
      Math.max(0, Math.min(from.y + dy, box.height)),
    );
  };

  // Someone who has not stirred the cloud for a while gets told what it is for.
  useEffect(() => {
    if (swept) return;
    const timer = window.setTimeout(() => setShowHint(true), HINT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [swept]);

  return (
    <section
      ref={fieldRef}
      // Vertical scrolling still belongs to the page; a sideways drag stirs the smoke.
      className="relative mt-8 h-[55vh] min-h-80 touch-pan-y overflow-hidden rounded-3xl [--smoke-glow:rgba(255,255,255,0.98)] dark:[--smoke-glow:rgba(170,205,255,0.72)]"
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        pointerRef.current = null;
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? KEY_STEP * 2 : KEY_STEP;
        if (event.key === "ArrowLeft") fan(-step, 0);
        else if (event.key === "ArrowRight") fan(step, 0);
        else if (event.key === "ArrowUp") fan(0, -step);
        else if (event.key === "ArrowDown") fan(0, step);
        else return;
        event.preventDefault();
      }}
      tabIndex={lifted ? -1 : 0}
      aria-label="A cloud of smoke. Move through it, or use the arrow keys, to find what is hidden in it."
    >
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
                  ? "rounded-full border border-dashed border-accent bg-white/90 px-2.5 py-1 font-mono text-sm text-accent no-underline shadow-sm hover:border-solid dark:bg-gray-900/90"
                  : "rounded-full border border-dashed border-gray-500 px-2.5 py-1 font-mono text-sm text-gray-600 no-underline dark:border-gray-400 dark:text-gray-200"
              }
            >
              {href}
            </Link>
          </motion.span>
        </div>
      ))}

      {/* The lit surface the smoke sits on. It goes with the smoke at the end. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-[radial-gradient(120%_90%_at_50%_20%,rgba(255,255,255,0.75),rgba(241,245,249,0.4)_60%,transparent)] transition-opacity duration-1000 dark:bg-[radial-gradient(120%_90%_at_50%_20%,rgba(40,58,92,0.5),rgba(18,26,44,0.35)_60%,transparent)]"
        style={{ opacity: lifted ? 0 : 1 }}
      />

      {/* Light behind the smoke, brightest where it is thinnest. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-5 transition-opacity duration-1000"
        style={{
          opacity: lifted ? 0 : 1,
          background:
            "radial-gradient(circle calc(var(--focus-r, 0px) * 1.5) at var(--focus-x, 50%) var(--focus-y, 50%), var(--smoke-glow), transparent 70%)",
        }}
      />

      {/* Out of focus everywhere, except the hole the smoke canvas keeps moving for it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-10 backdrop-blur-[9px] transition-opacity duration-1000"
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
        varsRef={fieldRef}
        onFocus={pickUp}
        lifted={lifted}
        calm={!!reduceMotion}
      />

      {showHint && !lifted && (
        <span className="pointer-events-none absolute inset-x-0 top-1/2 z-20 text-center text-xs tracking-wide text-gray-500 dark:text-gray-400">
          something is in the smoke
        </span>
      )}
      {count > 0 && (
        <span className="absolute right-4 bottom-3 z-20 text-xs text-gray-500 dark:text-gray-400">
          {count} of {HIDDEN_PAGES.length} found
        </span>
      )}
    </section>
  );
};

export default SearchPartyEgg;

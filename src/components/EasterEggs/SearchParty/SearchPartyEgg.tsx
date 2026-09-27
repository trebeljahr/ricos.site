import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { type Point, SmokeCanvas } from "./SmokeCanvas";

/** Pages hiding in the smoke, in no particular order. */
const HIDDEN_PAGES = ["/quotes", "/timeline", "/art", "/photography", "/eggs"];
/** How close the pointer has to pass for something to count as found. */
const REACH = 64;
const KEY_STEP = 48;
const HINT_AFTER_MS = 5000;
/** Above the smoke layer, which is z-40: what is found rises out of the cloud. */
const ABOVE_SMOKE = "45";

type Spot = { fx: number; fy: number };

/** One hiding place per page, spread over the field below the text. */
function scatter(): Spot[] {
  return HIDDEN_PAGES.map((_, i) => ({
    fx: (i % 2 === 0 ? 0.06 : 0.48) + Math.random() * 0.18,
    fy: 0.06 + (0.88 * (i + 0.2 + Math.random() * 0.6)) / HIDDEN_PAGES.length,
  }));
}

/**
 * Easter egg on the 404 page: smoke hangs over the whole screen, with Magritte's
 * pipe behind it and five links hidden in the field below the text. The pointer
 * parts the smoke a beat behind itself, light comes through where it thins and
 * the blur lifts with it, so the painting, the heading and a link at a time
 * become readable. The heading snaps into place once it has been found, the
 * smoke rolls back in everywhere else, and what the sweep touched stays out of
 * it. The last of the five is the list of easter eggs itself.
 */
const SearchPartyEgg = () => {
  const reduceMotion = useReducedMotion();
  const recordFind = useRecordEggFind();
  const skyRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<Point | null>(null);
  const chipRefs = useRef<(HTMLElement | null)[]>([]);
  const titleRef = useRef<HTMLElement | null>(null);
  const foundRef = useRef<boolean[]>(HIDDEN_PAGES.map(() => false));
  const titleFoundRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [round, setRound] = useState(0);
  const [spots, setSpots] = useState(scatter);
  const [found, setFound] = useState<boolean[]>(() => HIDDEN_PAGES.map(() => false));
  const [titleFound, setTitleFound] = useState(false);
  const [swept, setSwept] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const count = found.filter(Boolean).length;
  const lifted = count === HIDDEN_PAGES.length;

  useEffect(() => {
    setMounted(true);
    // The heading belongs to the page, so the egg picks it up from the document.
    titleRef.current = document.querySelector("main h1");
  }, []);

  // Someone who has not stirred the smoke for a while gets told what it is for.
  useEffect(() => {
    if (swept || lifted) return;
    const timer = window.setTimeout(() => setShowHint(true), HINT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [swept, lifted]);

  // A found heading rises above the smoke and lands with a snap.
  useEffect(() => {
    const title = titleRef.current;
    if (!title) return;
    if (!titleFound) {
      title.style.position = "";
      title.style.zIndex = "";
      return;
    }
    title.style.position = "relative";
    title.style.zIndex = ABOVE_SMOKE;
    if (reduceMotion) return;
    title.animate([{ scale: "1.04" }, { scale: "0.995" }, { scale: "1" }], {
      duration: 420,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    });
  }, [titleFound, reduceMotion]);

  /** Picks up whatever is at this point of the screen. Sets state only on a new find. */
  const pickUp = useCallback(
    (x: number, y: number) => {
      const covers = (el: Element | null, reach: number) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const nearestX = Math.max(r.left, Math.min(x, r.right));
        const nearestY = Math.max(r.top, Math.min(y, r.bottom));
        return Math.hypot(x - nearestX, y - nearestY) <= reach;
      };

      if (!titleFoundRef.current && covers(titleRef.current, REACH * 0.5)) {
        titleFoundRef.current = true;
        setTitleFound(true);
      }

      if (foundRef.current.every(Boolean)) return;
      const hits = chipRefs.current.map((chip, i) => !foundRef.current[i] && covers(chip, REACH));
      if (!hits.some(Boolean)) return;

      foundRef.current = foundRef.current.map((was, i) => was || hits[i]);
      setFound(foundRef.current);
      if (foundRef.current.every(Boolean)) recordFind("search-party");
    },
    [recordFind],
  );

  const aim = useCallback(
    (x: number, y: number) => {
      pointerRef.current = { x, y };
      // Picked up from the pointer as well as from the trailing focus, so a quick
      // sweep never skips something the pointer went straight over.
      pickUp(x, y);
      setSwept(true);
      setShowHint(false);
    },
    [pickUp],
  );

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
  }, [aim, lifted]);

  /** Keyboard fanning: the arrow keys walk the focus across the screen. */
  useEffect(() => {
    if (lifted) return;
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
  }, [aim, lifted]);

  /** Fills the screen with smoke again and hides everything back in it. */
  const refill = () => {
    foundRef.current = HIDDEN_PAGES.map(() => false);
    titleFoundRef.current = false;
    pointerRef.current = null;
    setFound(foundRef.current);
    setTitleFound(false);
    setSpots(scatter());
    setSwept(false);
    setRound((n) => n + 1);
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
              zIndex: found[i] ? ABOVE_SMOKE : undefined,
            }}
          >
            <motion.span
              className="inline-block"
              animate={found[i] ? { scale: [1.12, 0.99, 1] } : { scale: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.42 }}
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

        {/* In the page, not over it: at the end of the field, clear of the footer. */}
        {lifted && (
          <button
            type="button"
            onClick={refill}
            className="absolute right-0 bottom-0 cursor-pointer rounded-full border border-dashed border-gray-400 px-2.5 py-1 text-xs text-gray-500 hover:border-accent hover:text-accent dark:border-gray-600 dark:text-gray-400"
          >
            let the smoke back in
          </button>
        )}
      </div>

      {mounted &&
        createPortal(
          // Click-through: the page underneath keeps its clicks and its scrolling.
          <div
            ref={skyRef}
            className="pointer-events-none fixed inset-0 z-40 overflow-hidden [--smoke-glow:rgba(255,255,255,0.98)] dark:[--smoke-glow:rgba(170,205,255,0.72)]"
          >
            {/* Magritte's pipe, behind the smoke: this is not a page either. */}
            <div
              aria-hidden="true"
              className="absolute inset-[14%] z-0 transition-opacity duration-1000"
              style={{
                opacity: lifted ? 0 : 1,
                maskImage: "radial-gradient(ellipse at center, #000 40%, transparent 78%)",
                WebkitMaskImage: "radial-gradient(ellipse at center, #000 40%, transparent 78%)",
              }}
            >
              <Image
                src="/assets/blog/404.jpg"
                alt=""
                fill
                sizes="70vw"
                className="object-contain object-center opacity-45 dark:opacity-25"
              />
            </div>

            {/* Light behind the smoke, brightest where it is thinnest. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 z-1 transition-opacity duration-1000"
              style={{
                opacity: lifted ? 0 : 1,
                background:
                  "radial-gradient(circle calc(var(--focus-r, 0px) * 1.5) at var(--focus-x, 50%) var(--focus-y, 50%), var(--smoke-glow), transparent 70%)",
              }}
            />

            {/* Everything is out of focus except under the moving hole. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 z-10 backdrop-blur-[6px] transition-opacity duration-1000"
              style={{
                opacity: lifted ? 0 : 1,
                maskImage:
                  "radial-gradient(circle var(--focus-r, 0px) at var(--focus-x, 50%) var(--focus-y, 50%), transparent 0, transparent 45%, #000 100%)",
                WebkitMaskImage:
                  "radial-gradient(circle var(--focus-r, 0px) at var(--focus-x, 50%) var(--focus-y, 50%), transparent 0, transparent 45%, #000 100%)",
              }}
            />

            <SmokeCanvas
              key={round}
              pointerRef={pointerRef}
              varsRef={skyRef}
              onFocus={pickUp}
              lifted={lifted}
              calm={!!reduceMotion}
            />

            {showHint && !lifted && (
              <span className="absolute inset-x-0 bottom-16 z-20 text-center text-xs tracking-wide text-gray-500 dark:text-gray-400">
                something is in the smoke
              </span>
            )}

            {count > 0 && !lifted && (
              <span className="absolute right-5 bottom-5 z-20 text-xs text-gray-500 dark:text-gray-400">
                {count} of {HIDDEN_PAGES.length} found
              </span>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default SearchPartyEgg;

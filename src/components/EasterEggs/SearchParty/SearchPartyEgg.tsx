import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { type RefObject, useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { clampPageX, type PageBox, PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

/** Pages hiding in the empty part of the 404, in the order the search turns them up. */
const HIDDEN_PAGES = ["/quotes", "/timeline", "/art", "/photography", "/eggs"];
const CHIP_WIDTH = 140;
const LENS_SIZE = 34;
const FLIGHT_MS = 480;
const SNIFF_MS = 260;
const SETTLE_MS = 420;
const CHEER_MS = 1100;

type Spot = { fx: number; fy: number };
type Point = { left: number; top: number };

/** One hiding place per page, in bands down the empty area, alternating sides. */
function scatter(): Spot[] {
  return HIDDEN_PAGES.map((_, i) => ({
    fx: (i % 2 === 0 ? 0.04 : 0.44) + Math.random() * 0.16,
    fy: (i + 0.2 + Math.random() * 0.6) / HIDDEN_PAGES.length,
  }));
}

function place(spot: Spot, box: PageBox): Point {
  return {
    left: clampPageX(box.left + spot.fx * box.width, CHIP_WIDTH),
    top: box.top + spot.fy * Math.max(0, box.height - 48),
  };
}

type UncoveredProps = { href: string; at: Point; reduceMotion: boolean };

/** A corner of the page peeled back, with the link that was hiding under it. */
const Uncovered = ({ href, at, reduceMotion }: UncoveredProps) => (
  <div className="absolute" style={{ left: at.left, top: at.top, width: CHIP_WIDTH }}>
    <motion.span
      aria-hidden="true"
      className="absolute -top-1 left-1 block h-7 w-7 rounded-br-md border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-800"
      style={{ transformOrigin: "bottom right" }}
      initial={reduceMotion ? { opacity: 0, rotate: -34 } : { opacity: 1, rotate: 0, x: 0, y: 0 }}
      animate={{ opacity: 0.9, rotate: -34, x: -8, y: -12 }}
      transition={
        reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 180, damping: 14 }
      }
    />
    <motion.span
      className="pointer-events-auto relative inline-block"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: -6, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
      transition={
        reduceMotion
          ? { duration: 0.25 }
          : { type: "spring", stiffness: 320, damping: 18, delay: 0.12 }
      }
    >
      <Link
        href={href}
        className="rounded-full border border-dashed border-accent bg-white px-2.5 py-1 font-mono text-sm text-accent no-underline shadow-sm hover:border-solid dark:bg-gray-900"
      >
        {href}
      </Link>
    </motion.span>
  </div>
);

/**
 * Easter egg on the 404 page: the magnifying glass sweeps the empty space under
 * the text, and every click lifts a corner of the page off a real link that was
 * hiding there. The last thing it finds is the list of easter eggs itself.
 */
const SearchPartyEgg = ({ searchArea }: { searchArea: RefObject<HTMLElement | null> }) => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const glassRef = useRef<HTMLSpanElement>(null);
  const [spots] = useState(scatter);
  const [box, setBox] = useState<PageBox | null>(null);
  const [start, setStart] = useState<Point | null>(null);
  const [uncovered, setUncovered] = useState(0);
  const [lensAt, setLensAt] = useState<number | null>(null);
  const [cheering, setCheering] = useState(false);

  // Hiding places are fractions of the empty area, so they follow its layout.
  useEffect(() => {
    const measure = () => searchArea.current && setBox(pageBox(searchArea.current));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [searchArea]);

  const search = (index: number, last: boolean) =>
    run(async () => {
      // The glass flies out of the heading, so the lens starts where it sits.
      if (glassRef.current && !start) {
        const glass = pageBox(glassRef.current);
        setStart({ left: glass.left, top: glass.top });
      }
      setLensAt(index);
      await wait(reduceMotion ? 0 : FLIGHT_MS + SNIFF_MS);
      setUncovered(index + 1);
      if (!last) {
        await wait(reduceMotion ? 0 : SETTLE_MS);
        return;
      }
      setCheering(true);
      await wait(reduceMotion ? 300 : CHEER_MS);
      setLensAt(null);
      setCheering(false);
    });

  const registerClick = useEasterEgg("search-party", {
    clicks: HIDDEN_PAGES.length,
    // Every click plays a search, so these clicks are slow on purpose.
    windowMs: 60_000,
    onProgress: (clicks) => search(clicks - 1, false),
    onTrigger: () => search(HIDDEN_PAGES.length - 1, true),
  });

  const lens = box && lensAt !== null ? place(spots[lensAt], box) : null;

  return (
    <>
      404 - Page Not Found{" "}
      <EmojiButton
        label="Magnifying glass"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={glassRef} className="inline-block">
          {uncovered === HIDDEN_PAGES.length ? "🔎" : "🔍"}
        </span>
      </EmojiButton>
      <PageLayer>
        {box &&
          spots
            .slice(0, uncovered)
            .map((spot, i) => (
              <Uncovered
                key={HIDDEN_PAGES[i]}
                href={HIDDEN_PAGES[i]}
                at={place(spot, box)}
                reduceMotion={!!reduceMotion}
              />
            ))}
        <AnimatePresence>
          {lens && start && (
            <motion.span
              key="lens"
              aria-hidden="true"
              className="absolute top-0 left-0 block"
              style={{ width: LENS_SIZE, height: LENS_SIZE }}
              initial={{ x: start.left, y: start.top, opacity: 0, scale: 0.5 }}
              animate={{
                x: lens.left - 6,
                y: lens.top - LENS_SIZE + 4,
                opacity: 1,
                scale: cheering ? 1.3 : 1,
                rotate: cheering ? 375 : 0,
              }}
              exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.35 } }}
              transition={
                reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 260, damping: 22 }
              }
            >
              {/* The light the glass throws, so the sweep reads as a search beam. */}
              <span className="absolute -inset-3 rounded-full bg-[radial-gradient(circle,rgba(250,204,21,0.35),transparent_70%)]" />
              <span className="relative block text-[28px] leading-none motion-safe:animate-egg-search">
                🔍
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </PageLayer>
    </>
  );
};

export default SearchPartyEgg;

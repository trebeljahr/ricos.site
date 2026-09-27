import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { LookingGlass, type Point } from "./LookingGlass";

/** Pages hiding behind the glass: the start of the site, and the best of it. */
const HIDDEN_PAGES = [
  "/start-here",
  "/photography/best-of",
  "/needlestack",
  "/posts/diatoms",
  "/posts/the-best-yellow",
  "/r3f",
  "/quotes",
  "/timeline",
  "/now",
  "/principles",
  "/booknotes",
  "/newsletters",
];
/** What a hiding place must keep off: the words, and the picture. */
const KEEP_CLEAR = "main h1, main p, [data-page-picture]";
/** Room left between one hiding place and the next. */
const ROOM = 16;
/** And the margin kept from the edges of the window, the navbar and the
    footer. A link pressed against the bottom of the window reads as
    something that fell there rather than something that was hidden. */
const MARGIN = (span: number) => Math.max(24, Math.min(64, Math.round(span * 0.05)));
/** And the wider berth they give the words and the picture, which are what
    the page is about: the links are meant to be somewhere else, not crowding
    the two things that are already plain to see. */
const CLEARANCE = 36;
/** The shortest gap that still reads as a gap, when a side of the frame is
    carrying more links than it comfortably holds. */
const TIGHT = 10;
/** Links to a side of the frame. The rest share the top and the bottom,
    which are long enough to take them. */
const PER_SIDE = 2;
/** The gap a long side wants between its links. Below it the row is packed
    rather than set out, and it hands its shortest names to the sides. */
const COMFY = 36;
/** How far along its line every other link is nudged, so the frame is even
    without being a ruler. */
const STAGGER = 14;
const KEY_STEP = 52;
const HINT_AFTER_MS = 5000;
/** Under the navbar (z-999) and the footer, which are never behind the glass. */
const GLASS_Z = 40;
/** The page is paper-coloured and the footer has no background of its own, so
    it would be left standing on the paper in the theme's own colours. It takes
    the page's background instead, the way the navbar already carries one. */
const FOOTER_SOLID = ["bg-white", "dark:bg-gray-900"];
/** Looking through glass is a thing you do with a pointer. A touch screen has
    none, so it gets the plain page: the picture, the words, and a list. */
const canSearch = () =>
  typeof window === "undefined" || window.matchMedia("(hover: hover) and (pointer: fine)").matches;

type Spot = { x: number; y: number };
/**
 * Easter egg on the 404 page: a sheet of frosted glass lies over everything,
 * and the pointer drags one clear round patch about it. The words, the links
 * and the picture are all behind the sheet the whole time, blurred past
 * reading until the patch passes over them and blurred again once it has gone
 * — so the page is searched, never uncovered. Turning up here is what earns
 * the egg; the links are for the looking. On a touch screen there is no
 * pointer to look through, so there is no glass either.
 */
const SearchPartyEgg = () => {
  const recordFind = useRecordEggFind();
  const pointerRef = useRef<Point | null>(null);
  const chipRefs = useRef<(HTMLElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searching] = useState(canSearch);
  const [spots, setSpots] = useState<Spot[] | null>(null);
  // Without glass there is nothing to search: the links are simply a list.
  const [glazed, setGlazed] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [looked, setLooked] = useState(false);

  const hiding = searching && glazed;

  useEffect(() => {
    setMounted(true);
    // Finding the page at all is what earns it. The links are for fun.
    recordFind("search-party");
    const footer = document.querySelector<HTMLElement>("body footer");
    if (footer) {
      footer.style.zIndex = String(GLASS_Z + 1);
      footer.classList.add(...FOOTER_SOLID);
    }
    return () => {
      if (!footer) return;
      footer.style.zIndex = "";
      footer.classList.remove(...FOOTER_SOLID);
    };
  }, [recordFind]);

  /** Sets the links out as a frame around the words and the picture: a row
      above, a row below, a column down either side. Each side shares one
      line, and the gaps along a side are all the same, so what comes out is
      ordered rather than scattered — the links look placed, not spilled. */
  useLayoutEffect(() => {
    if (!hiding || !mounted) return;

    const place = () => {
      const blocked = [...document.querySelectorAll<HTMLElement>(KEEP_CLEAR)]
        .map((el) => el.getBoundingClientRect())
        .filter((box) => box.width > 0 && box.height > 0);
      const navbar = document.querySelector<HTMLElement>("header#navbar")?.getBoundingClientRect();
      const footer = document.querySelector<HTMLElement>("body footer")?.getBoundingClientRect();
      const margin = MARGIN(Math.min(innerWidth, innerHeight));
      const band = {
        left: margin,
        right: innerWidth - margin,
        top: (navbar?.bottom ?? 0) + margin,
        bottom: (footer && footer.top < innerHeight ? footer.top : innerHeight) - margin,
      };

      const sizes = chipRefs.current.map((el) => {
        const { width, height } = el?.getBoundingClientRect() ?? { width: 130, height: 28 };
        return { width, height };
      });
      if (!sizes.length) return;
      if (!blocked.length) return;

      // Everything the frame goes around, as one box with its berth on it.
      const inner = {
        left: Math.min(...blocked.map((b) => b.left)) - CLEARANCE,
        right: Math.max(...blocked.map((b) => b.right)) + CLEARANCE,
        top: Math.min(...blocked.map((b) => b.top)) - CLEARANCE,
        bottom: Math.max(...blocked.map((b) => b.bottom)) + CLEARANCE,
      };

      // The four sides of it, each with the room it has to give.
      type Side = {
        upright: boolean;
        line: number;
        from: number;
        to: number;
        depth: number;
        holds: number[];
      };
      const sides: Side[] = [
        {
          upright: false,
          line: (band.top + Math.min(inner.top, band.bottom)) / 2,
          from: band.left,
          to: band.right,
          depth: inner.top - band.top,
          holds: [],
        },
        {
          upright: false,
          line: (Math.max(inner.bottom, band.top) + band.bottom) / 2,
          from: band.left,
          to: band.right,
          depth: band.bottom - inner.bottom,
          holds: [],
        },
        {
          upright: true,
          line: (band.left + Math.min(inner.left, band.right)) / 2,
          from: Math.max(band.top, inner.top),
          to: Math.min(band.bottom, inner.bottom),
          depth: inner.left - band.left,
          holds: [],
        },
        {
          upright: true,
          line: (Math.max(inner.right, band.left) + band.right) / 2,
          from: Math.max(band.top, inner.top),
          to: Math.min(band.bottom, inner.bottom),
          depth: band.right - inner.right,
          holds: [],
        },
      ];

      const along = (side: Side, i: number) => (side.upright ? sizes[i].height : sizes[i].width);
      const across = (side: Side, i: number) => (side.upright ? sizes[i].width : sizes[i].height);
      const length = (side: Side) => Math.max(0, side.to - side.from);
      const taken = (side: Side) =>
        side.holds.reduce((sum, i) => sum + along(side, i), 0) + (side.holds.length + 1) * ROOM;

      // Two to each side, and the rest along the top and the bottom. The
      // narrowest names take the sides, since a side is only as wide as the
      // margin beside the words; the widest go first to whichever of the
      // long two is carrying less, which keeps those two even.
      const byWidth = sizes.map((_, i) => i).sort((a, b) => sizes[a].width - sizes[b].width);
      const [above, below, leftward, rightward] = sides;
      const upright = [leftward, rightward];
      const long = [above, below];

      const waiting: number[] = [];
      for (const i of byWidth) {
        const side = upright.find(
          (one) => one.holds.length < PER_SIDE && across(one, i) + TIGHT <= one.depth,
        );
        if (side) side.holds.push(i);
        else waiting.push(i);
      }

      for (const i of waiting.sort((a, b) => sizes[b].width - sizes[a].width)) {
        const room = (side: Side) => (length(side) - taken(side)) / Math.max(1, length(side));
        const fits = long.filter((one) => across(one, i) + TIGHT <= one.depth);
        const side = (fits.length ? fits : long).sort((a, b) => room(b) - room(a))[0];
        side.holds.push(i);
      }

      // A row with no room above the words carries the lot, which packs it.
      // Whatever it cannot set out properly goes to the sides instead, even
      // though they have had their two.
      for (const side of long) {
        while (side.holds.length > 1) {
          const spare = length(side) - side.holds.reduce((sum, i) => sum + along(side, i), 0);
          if (spare / (side.holds.length + 1) >= COMFY) break;
          const narrowest = [...side.holds].sort((a, b) => sizes[a].width - sizes[b].width)[0];
          const target = upright
            .filter(
              (one) =>
                across(one, narrowest) + TIGHT <= one.depth &&
                length(one) - taken(one) - along(one, narrowest) > TIGHT,
            )
            .sort((a, b) => length(b) - taken(b) - (length(a) - taken(a)))[0];
          if (!target) break;
          side.holds.splice(side.holds.indexOf(narrowest), 1);
          target.holds.push(narrowest);
        }
      }

      // Laid out along each side with the gaps all of a size, and every other
      // link nudged along its line: even, but not measured out with a ruler.
      const spots: Spot[] = sizes.map(() => ({ x: 0, y: 0 }));
      for (const side of sides) {
        if (!side.holds.length) continue;
        const spare = length(side) - side.holds.reduce((sum, i) => sum + along(side, i), 0);
        const gap = Math.max(TIGHT, spare / (side.holds.length + 1));
        const wander = Math.min(STAGGER, Math.max(0, (gap - TIGHT) / 2));
        let at = side.from + gap;
        side.holds.forEach((i, nth) => {
          const nudged = at + (nth % 2 ? wander : -wander);
          spots[i] = side.upright
            ? { x: side.line - sizes[i].width / 2, y: nudged }
            : { x: nudged, y: side.line - sizes[i].height / 2 };
          at += along(side, i) + gap;
        });
      }

      setSpots(spots);
    };

    place();
    window.addEventListener("resize", place);
    // The words are not all there at once: the guess at a mistyped address
    // arrives after the page has been looked up, and a link set out before it
    // turns up would be left sitting underneath it.
    const main = document.querySelector("main");
    let soon = 0;
    const again = () => {
      window.cancelAnimationFrame(soon);
      soon = window.requestAnimationFrame(place);
    };
    const watcher = main ? new MutationObserver(again) : null;
    watcher?.observe(main as Node, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("resize", place);
      window.cancelAnimationFrame(soon);
      watcher?.disconnect();
    };
  }, [hiding, mounted]);

  // Someone who has not moved the glass for a while gets told what it is for.
  useEffect(() => {
    if (looked || !hiding) return;
    const timer = window.setTimeout(() => setShowHint(true), HINT_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [looked, hiding]);

  const look = useCallback((x: number, y: number) => {
    pointerRef.current = { x, y };
    setLooked(true);
    setShowHint(false);
  }, []);

  // The glass lies over the whole page, so the page keeps the pointer and the
  // clicks, and the looking is read from the window instead.
  useEffect(() => {
    if (!hiding) return;
    const move = (event: PointerEvent) => look(event.clientX, event.clientY);
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
  }, [look, hiding]);

  /** Keyboard looking: the arrow keys walk the glass across the page. */
  useEffect(() => {
    if (!hiding) return;
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const at = { x: innerWidth / 2, y: innerHeight / 2 };
    const walk = (event: KeyboardEvent) => {
      const step = steps[event.key];
      if (!step || event.target !== document.body) return;
      const size = event.shiftKey ? KEY_STEP * 2 : KEY_STEP;
      at.x = Math.max(0, Math.min(at.x + step[0] * size, innerWidth));
      at.y = Math.max(0, Math.min(at.y + step[1] * size, innerHeight));
      look(at.x, at.y);
      event.preventDefault();
    };
    window.addEventListener("keydown", walk);
    return () => window.removeEventListener("keydown", walk);
  }, [look, hiding]);

  const chip =
    "rounded-full border border-dashed border-gray-500/50 px-2.5 py-1 font-mono text-xs text-gray-800 no-underline hover:border-solid hover:border-accent hover:text-accent sm:text-sm dark:border-gray-400/50 dark:text-gray-100";

  return (
    <>
      {/* A plain list where there is no glass to look through. */}
      {!hiding && (
        <ul className="mt-group flex list-none flex-wrap justify-center gap-2 p-0 md:justify-start">
          {HIDDEN_PAGES.map((href) => (
            <li key={href} className="m-0 p-0">
              <Link href={href} className={chip}>
                {href}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {mounted &&
        hiding &&
        createPortal(
          <nav
            className="pointer-events-none fixed inset-0"
            style={{ zIndex: GLASS_Z - 1 }}
            aria-label="Pages hidden behind the glass"
          >
            {HIDDEN_PAGES.map((href, i) => (
              <Link
                key={href}
                href={href}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                className={`pointer-events-auto absolute ${chip}`}
                style={
                  spots
                    ? { left: `${spots[i].x}px`, top: `${spots[i].y}px` }
                    : { left: 0, top: 0, visibility: "hidden" }
                }
              >
                {href}
              </Link>
            ))}
          </nav>,
          document.body,
        )}

      {mounted &&
        searching &&
        createPortal(
          // Click-through: the page underneath keeps its clicks and its scrolling.
          <div
            className="pointer-events-none fixed inset-0 overflow-hidden"
            style={{ zIndex: GLASS_Z }}
          >
            <LookingGlass pointerRef={pointerRef} calm={false} onReady={setGlazed} />
            {showHint && (
              <span className="absolute inset-x-0 bottom-16 text-center font-mono text-xs tracking-wide text-gray-500 dark:text-gray-400">
                look through the glass
              </span>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default SearchPartyEgg;

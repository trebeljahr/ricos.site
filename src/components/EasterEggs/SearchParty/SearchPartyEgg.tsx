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
/** Room left around everything a hiding place keeps off, and around the next. */
const ROOM = 16;
/** How many places to try before a link settles for wherever it can go. */
const TRIES = 120;
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
type Box = { left: number; right: number; top: number; bottom: number };

const clash = (a: Box, b: Box) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

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

  /** Deals the links out over the whole window, anywhere the words and the
      picture are not — above the title, beside the picture, under both. */
  useLayoutEffect(() => {
    if (!hiding || !mounted) return;
    const place = () => {
      const avoid: Box[] = [...document.querySelectorAll<HTMLElement>(KEEP_CLEAR)].map((el) =>
        el.getBoundingClientRect(),
      );
      const navbar = document.querySelector<HTMLElement>("header#navbar")?.getBoundingClientRect();
      const footer = document.querySelector<HTMLElement>("body footer")?.getBoundingClientRect();
      const top = (navbar?.bottom ?? 0) + ROOM;
      const floor = (footer && footer.top < innerHeight ? footer.top : innerHeight) - ROOM;
      const taken: Box[] = [];

      setSpots(
        chipRefs.current.map((el) => {
          const { width, height } = el?.getBoundingClientRect() ?? { width: 130, height: 28 };
          const spanX = Math.max(1, innerWidth - width - ROOM * 2);
          const spanY = Math.max(1, floor - top - height);
          let spot = { x: ROOM, y: top };
          for (let tries = 0; tries < TRIES; tries++) {
            const at = { x: ROOM + Math.random() * spanX, y: top + Math.random() * spanY };
            const box = {
              left: at.x - ROOM,
              right: at.x + width + ROOM,
              top: at.y - ROOM,
              bottom: at.y + height + ROOM,
            };
            if (avoid.some((other) => clash(box, other))) continue;
            if (taken.some((other) => clash(box, other))) continue;
            taken.push(box);
            spot = at;
            break;
          }
          return spot;
        }),
      );
    };

    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
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

  // Written in the page's own ink, which is the picture's. See 404.tsx.
  const chip =
    "rounded-full border border-dashed border-[#2f2a20]/45 px-2.5 py-1 font-mono text-xs text-[#2f2a20] no-underline hover:border-solid hover:bg-[#2f2a20]/5 sm:text-sm dark:border-[#f0e6d2]/40 dark:text-[#f0e6d2] dark:hover:bg-[#f0e6d2]/10";

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
          <div
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
          </div>,
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
              <span className="absolute inset-x-0 bottom-16 text-center font-mono text-xs tracking-wide text-[#2f2a20]/70 dark:text-[#f0e6d2]/70">
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

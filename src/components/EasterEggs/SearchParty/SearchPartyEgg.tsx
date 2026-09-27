import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { LookingGlass, type Point } from "./LookingGlass";

/** Pages hiding behind the glass, in no particular order. */
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
const KEY_STEP = 52;
const HINT_AFTER_MS = 5000;
/** Under the navbar (z-999) and the footer, which are never behind the glass. */
const GLASS_Z = 40;
/** The page is paper-coloured and the footer has no background of its own, so
    it would be left standing on the paper in the theme's own colours. It takes
    the page's background instead, the way the navbar already carries one. */
const FOOTER_SOLID = ["bg-white", "dark:bg-gray-900"];
/** Columns the hiding places are dealt into, over the half of the field the
    picture leaves free. */
const COLUMNS = 2;
/** Looking through glass is a thing you do with a pointer. A touch screen has
    none, so it gets the plain page: the picture, the words, and a list. */
const canSearch = () =>
  typeof window === "undefined" || window.matchMedia("(hover: hover) and (pointer: fine)").matches;

type Spot = { fx: number; fy: number };

/** A hiding place per page: one to a cell of a loose grid, in any order. The
    grid stops short of the picture, so nothing is ever hidden on top of it. */
function scatter(): Spot[] {
  const rows = Math.ceil(HIDDEN_PAGES.length / COLUMNS);
  const cells = [...Array(COLUMNS * rows).keys()];
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return HIDDEN_PAGES.map((_, i) => {
    const cell = cells[i];
    return {
      fx: ((cell % COLUMNS) + 0.06 + Math.random() * 0.62) / COLUMNS,
      fy: (Math.floor(cell / COLUMNS) + 0.16 + Math.random() * 0.56) / rows,
    };
  });
}

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
  const [mounted, setMounted] = useState(false);
  const [searching] = useState(canSearch);
  const [spots] = useState(scatter);
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

  // The page is the colour of the picture's border, so the links are written
  // in its ink rather than in the theme's. Keep in step with PAPER in 404.tsx.
  const chip =
    "rounded-full border border-dashed border-[#2f2a20]/45 px-2.5 py-1 font-mono text-xs text-[#2f2a20] no-underline hover:border-solid hover:bg-[#2f2a20]/5 sm:text-sm";

  return (
    <>
      {/* A plain list where there is no glass to look through. */}
      {!hiding && (
        <ul className="mt-group flex list-none flex-wrap gap-2 p-0">
          {HIDDEN_PAGES.map((href) => (
            <li key={href} className="m-0 p-0">
              <Link href={href} className={chip}>
                {href}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* The field the links hide in. It keeps to the side of the page the
          picture leaves free, and starts below the words, so a link never
          sits on top of either. */}
      {hiding && (
        <div className="relative mt-group h-[90vh] w-full max-w-[26rem] lg:max-w-[30rem]">
          {HIDDEN_PAGES.map((href, i) => (
            <div
              key={href}
              className="absolute"
              style={{
                left: `min(${spots[i].fx * 100}%, calc(100% - 9rem))`,
                top: `${spots[i].fy * 100}%`,
              }}
            >
              <Link href={href} className={chip}>
                {href}
              </Link>
            </div>
          ))}
        </div>
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
              <span className="absolute inset-x-0 bottom-16 text-center font-mono text-xs tracking-wide text-[#2f2a20]/70">
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

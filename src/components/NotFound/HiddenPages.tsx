import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type FrameEdge, type FrameSpot, placeFrame } from "./frameLayout";
import { LookingGlass, type Point } from "./LookingGlass";

type FrameItem = { edge: FrameEdge } & (
  | { href: string; emoji?: never }
  | { emoji: string; href?: never }
);

/** Longer paths have the full row; the narrow columns get short paths. */
const FRAME_ITEMS: FrameItem[] = [
  { edge: "top", href: "/needlestack" },
  { edge: "top", emoji: "🍄" },
  { edge: "top", href: "/photography/best-of" },
  { edge: "top", href: "/posts/diatoms" },
  { edge: "bottom", href: "/principles" },
  { edge: "bottom", href: "/posts/the-best-yellow" },
  { edge: "bottom", emoji: "🪁" },
  { edge: "bottom", href: "/newsletters" },
  { edge: "left", href: "/r3f" },
  { edge: "left", emoji: "🐌" },
  { edge: "left", href: "/now" },
  { edge: "left", href: "/quotes" },
  { edge: "right", href: "/timeline" },
  { edge: "right", href: "/booknotes" },
  { edge: "right", emoji: "🪐" },
  { edge: "right", href: "/start-here" },
];
const HIDDEN_PAGES = FRAME_ITEMS.flatMap((item) => (item.href ? [item.href] : []));
const KEEP_CLEAR = "main h1, main p, [data-page-picture]";
const MARGIN = (span: number) => Math.max(24, Math.min(64, Math.round(span * 0.05)));
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

/**
 * The 404 page's looking glass: a sheet of frosted glass lies over everything,
 * and the pointer drags one clear round patch about it. The words, the links
 * and the picture are all behind the sheet the whole time, blurred past
 * reading until the patch passes over them and blurred again once it has gone
 * — so the page is searched, never uncovered. On a touch screen there is no
 * pointer to look through, so there is no glass either.
 */
const HiddenPages = () => {
  const pointerRef = useRef<Point | null>(null);
  const chipRefs = useRef<(HTMLElement | null)[]>([]);
  const [mounted, setMounted] = useState(false);
  const [searching] = useState(canSearch);
  const [spots, setSpots] = useState<FrameSpot[] | null | undefined>(undefined);
  // Without glass there is nothing to search: the links are simply a list.
  const [glazed, setGlazed] = useState(true);
  const [showHint, setShowHint] = useState(false);
  const [looked, setLooked] = useState(false);

  const measuring = searching && glazed;
  const hiding = measuring && spots !== null;

  useEffect(() => {
    setMounted(true);
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
  }, []);

  // Measure real text and image boxes so font loading, suggestions and resizing
  // all keep the same clear frame. If it cannot fit, use the plain link list.
  useLayoutEffect(() => {
    if (!measuring || !mounted) return;

    const place = () => {
      const blocked = [...document.querySelectorAll<HTMLElement>(KEEP_CLEAR)]
        .map((el) => el.getBoundingClientRect())
        .filter((box) => box.width > 0 && box.height > 0);
      if (!blocked.length) return;
      const navbar = document.querySelector<HTMLElement>("header#navbar")?.getBoundingClientRect();
      const footer = document.querySelector<HTMLElement>("body footer")?.getBoundingClientRect();
      const margin = MARGIN(Math.min(innerWidth, innerHeight));
      const bounds = {
        left: margin,
        right: innerWidth - margin,
        top: (navbar?.bottom ?? 0) + margin,
        bottom: Math.min(footer?.top ?? innerHeight, innerHeight) - margin,
      };
      const content = {
        left: Math.min(...blocked.map((box) => box.left)),
        right: Math.max(...blocked.map((box) => box.right)),
        top: Math.min(...blocked.map((box) => box.top)),
        bottom: Math.max(...blocked.map((box) => box.bottom)),
      };
      const items = FRAME_ITEMS.map((item, i) => {
        const { width, height } = chipRefs.current[i]?.getBoundingClientRect() ?? {
          width: 130,
          height: 32,
        };
        return { edge: item.edge, width, height };
      });
      setSpots(placeFrame(items, bounds, content));
    };

    place();
    window.addEventListener("scroll", place, { passive: true });
    // The words are not all there at once: the guess at a mistyped address
    // arrives after the page has been looked up, and a link dealt out before
    // it turns up would be left sitting underneath it.
    const main = document.querySelector("main");
    let soon = 0;
    const again = () => {
      window.cancelAnimationFrame(soon);
      soon = window.requestAnimationFrame(place);
    };
    // Remove the fallback list before measuring a newly sized viewport: its
    // height otherwise shifts the title and can keep a roomy frame in fallback.
    const resize = () => {
      setSpots(undefined);
      again();
    };
    window.addEventListener("resize", resize);
    // Watching for the line to turn up rather than for the page to change
    // size: the page is as tall as the window whatever is written on it.
    const watcher = main ? new MutationObserver(again) : null;
    watcher?.observe(main as Node, { childList: true, subtree: true });
    const observer = new ResizeObserver(again);
    document.querySelectorAll<HTMLElement>(KEEP_CLEAR).forEach((el) => {
      observer.observe(el);
    });
    document.fonts.addEventListener("loadingdone", again);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", place);
      document.fonts.removeEventListener("loadingdone", again);
      observer.disconnect();
      window.cancelAnimationFrame(soon);
      watcher?.disconnect();
    };
  }, [measuring, mounted]);

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
    "whitespace-nowrap rounded-full border border-dashed border-gray-500/50 px-2.5 py-1 font-mono text-xs text-gray-800 no-underline hover:border-solid hover:border-accent hover:text-accent sm:text-sm dark:border-gray-400/50 dark:text-gray-100";

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
        measuring &&
        createPortal(
          <nav
            className="pointer-events-none fixed inset-0"
            style={{ zIndex: GLASS_Z - 1 }}
            aria-label="Pages hidden behind the glass"
            aria-hidden={!spots}
          >
            {FRAME_ITEMS.map((item, i) => {
              const style = spots
                ? { left: spots[i].x, top: spots[i].y }
                : { left: 0, top: 0, visibility: "hidden" as const };
              const ref = (el: HTMLElement | null) => {
                chipRefs.current[i] = el;
              };
              return item.href ? (
                <Link
                  key={item.href}
                  href={item.href}
                  ref={ref}
                  className={`pointer-events-auto absolute ${chip}`}
                  style={style}
                >
                  {item.href}
                </Link>
              ) : (
                <span
                  key={item.emoji}
                  ref={ref}
                  aria-hidden="true"
                  className="absolute select-none text-3xl leading-none"
                  style={style}
                >
                  {item.emoji}
                </span>
              );
            })}
          </nav>,
          document.body,
        )}

      {mounted &&
        searching &&
        spots !== null &&
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

export default HiddenPages;

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
/** And the wider berth they give the words and the picture, which are what
    the page is about: the links are meant to be somewhere else, not crowding
    the two things that are already plain to see. */
const CLEARANCE = 36;
/** On a short window there is not the room for that berth, and one nothing
    fits around leaves every link heaped in whatever corner is left, so it
    gives way as far as this before that happens. */
const CLEARANCE_MIN = 12;
/** Spots that have to be standable in each band of the window before the
    berth is worth keeping — one for the top of it, one for the middle, one
    for the bottom. A berth that leaves nothing to stand on above the words
    puts every link below them, which is the heap it was meant to prevent. */
const ENOUGH_GROUND = 8;
/** How finely the free space is sampled when working out where to put them. */
const SAMPLE = 14;
/** Turns of settling and tidying. Tidying a link off its neighbour undoes a
    little of the evenness the settling found, so the two take turns rather
    than the tidying having the last word. */
const TURNS = 5;
const SETTLE = 26;
const NUDGES = 8;
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
      picture are not. They are dropped on a grid to start with and then left
      to settle: every round each link is pushed off its neighbours and out of
      whatever it is sitting on, so what comes out is evenly spaced rather
      than evenly random — no clusters, and the same air around each one. */
  useLayoutEffect(() => {
    if (!hiding || !mounted) return;

    const place = () => {
      const blocked: Box[] = [...document.querySelectorAll<HTMLElement>(KEEP_CLEAR)]
        .map((el) => el.getBoundingClientRect())
        .filter((box) => box.width > 0 && box.height > 0);
      const navbar = document.querySelector<HTMLElement>("header#navbar")?.getBoundingClientRect();
      const footer = document.querySelector<HTMLElement>("body footer")?.getBoundingClientRect();
      const band = {
        left: ROOM,
        right: innerWidth - ROOM,
        top: (navbar?.bottom ?? 0) + ROOM,
        bottom: (footer && footer.top < innerHeight ? footer.top : innerHeight) - ROOM,
      };

      const sizes = chipRefs.current.map((el) => {
        const { width, height } = el?.getBoundingClientRect() ?? { width: 130, height: 28 };
        return { width, height };
      });
      const count = sizes.length;
      if (!count) return;

      const wide = band.right - band.left;
      const tall = Math.max(1, band.bottom - band.top);

      // The window, sampled on a coarse grid. Every point on it is ground a
      // link might stand on, and the shape of that ground is what the spread
      // below is measured against.
      const open: number[][] = [];
      for (let y = band.top; y <= band.bottom; y += SAMPLE) {
        for (let x = band.left; x <= band.right; x += SAMPLE) open.push([x, y]);
      }

      const at = sizes.map((size, i) => ({
        x: band.left + ((i % 4) + 0.5) * (wide / 4),
        y: band.top + ((Math.floor(i / 4) % 3) + 0.5) * (tall / 3),
        ...size,
      }));

      // Which of those points each link could actually stand on: a link is
      // as wide as its name, so a point that would hang a long one over the
      // words is ground only the short ones can use.
      const groundFor = (berth: number) =>
        at.map((one) => {
          const halfW = one.width / 2 + ROOM;
          const halfH = one.height / 2 + ROOM;
          const keepX = one.width / 2 + berth;
          const keepY = one.height / 2 + berth;
          return open.map(
            ([x, y]) =>
              x >= band.left + halfW &&
              x <= band.right - halfW &&
              y >= band.top + halfH &&
              y <= band.bottom - halfH &&
              !blocked.some(
                (b) =>
                  x + keepX > b.left &&
                  x - keepX < b.right &&
                  y + keepY > b.top &&
                  y - keepY < b.bottom,
              ),
          );
        });

      // As wide a berth as the window can actually afford.
      let clearance = CLEARANCE;
      let standable = groundFor(clearance);
      // Ground in every third of the window, not merely a lot of it in one.
      const roomEnough = (ground: boolean[][]) => {
        const thirds = [0, 0, 0];
        for (let s = 0; s < open.length; s++) {
          if (!ground.some((spots) => spots[s])) continue;
          const third = Math.min(2, Math.floor(((open[s][1] - band.top) / tall) * 3));
          thirds[third]++;
        }
        return thirds.every((spots) => spots >= ENOUGH_GROUND);
      };
      while (clearance > CLEARANCE_MIN && !roomEnough(standable)) {
        clearance = Math.max(CLEARANCE_MIN, clearance - 8);
        standable = groundFor(clearance);
      }

      const boxOf = (one: (typeof at)[number], room = ROOM) => ({
        left: one.x - one.width / 2 - room,
        right: one.x + one.width / 2 + room,
        top: one.y - one.height / 2 - room,
        bottom: one.y + one.height / 2 + room,
      });

      /** Each link takes the middle of the ground that is nearer to it than
          to any other. Even ground, rather than even spacing: links can sit a
          fixed distance apart in a row and still leave half the window
          empty. */
      const settle = (rounds: number) => {
        for (let round = 0; round < rounds; round++) {
          const pull = at.map(() => ({ x: 0, y: 0, n: 0 }));
          for (let s = 0; s < open.length; s++) {
            const [x, y] = open[s];
            let nearest = -1;
            let best = Number.POSITIVE_INFINITY;
            for (let i = 0; i < count; i++) {
              if (!standable[i][s]) continue;
              const away = (at[i].x - x) ** 2 + (at[i].y - y) ** 2;
              if (away < best) {
                best = away;
                nearest = i;
              }
            }
            if (nearest < 0) continue;
            pull[nearest].x += x;
            pull[nearest].y += y;
            pull[nearest].n++;
          }
          for (let i = 0; i < count; i++) {
            if (!pull[i].n) continue;
            at[i].x = pull[i].x / pull[i].n;
            at[i].y = pull[i].y / pull[i].n;
          }
        }
      };

      /** Middles can be evenly spread and still leave two long links
          touching, so they are separated by their boxes, and anything sitting
          on the words or the picture is moved off. */
      const tidy = (passes: number) => {
        for (let pass = 0; pass < passes; pass++) {
          for (let i = 0; i < count; i++) {
            for (let j = i + 1; j < count; j++) {
              const a = boxOf(at[i]);
              const b = boxOf(at[j]);
              if (!clash(a, b)) continue;
              const overX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
              const overY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
              if (overX < overY) {
                const push = (overX / 2) * (at[i].x < at[j].x ? -1 : 1);
                at[i].x += push;
                at[j].x -= push;
              } else {
                const push = (overY / 2) * (at[i].y < at[j].y ? -1 : 1);
                at[i].y += push;
                at[j].y -= push;
              }
            }
          }
          for (let i = 0; i < count; i++) {
            const halfW = at[i].width / 2 + ROOM;
            const halfH = at[i].height / 2 + ROOM;
            for (const other of blocked) {
              const box = boxOf(at[i], clearance);
              if (!clash(box, other)) continue;
              // Four ways out. A link held against the edge of the window
              // cannot take the nearest one, so the shortest it can actually
              // take is the one it takes.
              const ways = [
                { x: other.left - box.right, y: 0 },
                { x: other.right - box.left, y: 0 },
                { x: 0, y: other.top - box.bottom },
                { x: 0, y: other.bottom - box.top },
              ]
                .filter((way) => {
                  const x = at[i].x + way.x;
                  const y = at[i].y + way.y;
                  return (
                    x >= band.left + halfW &&
                    x <= band.right - halfW &&
                    y >= band.top + halfH &&
                    y <= band.bottom - halfH
                  );
                })
                .sort((one, two) => Math.hypot(one.x, one.y) - Math.hypot(two.x, two.y));
              const way = ways[0];
              if (!way) continue;
              at[i].x += way.x;
              at[i].y += way.y;
            }
            at[i].x = Math.min(Math.max(at[i].x, band.left + halfW), band.right - halfW);
            at[i].y = Math.min(Math.max(at[i].y, band.top + halfH), band.bottom - halfH);
          }
        }
      };

      for (let turn = 0; turn < TURNS; turn++) {
        settle(SETTLE);
        tidy(NUDGES);
      }
      // Settling has the last word on where they sit, and tidying the last
      // word on what they are allowed to sit on.
      settle(SETTLE);
      tidy(NUDGES);

      // Last resort. A link with nowhere good to go can end up pressed
      // against the words after all that pushing, so any that is still on
      // them is picked up and put down on the emptiest ground it can stand
      // on — which is always somewhere, since it had ground to begin with.
      for (let i = 0; i < count; i++) {
        const stuck =
          blocked.some((other) => clash(boxOf(at[i], clearance), other)) ||
          at.some((one, j) => j !== i && clash(boxOf(at[i]), boxOf(one)));
        if (!stuck) continue;
        let best: number[] | null = null;
        let emptiest = -1;
        for (let s = 0; s < open.length; s++) {
          if (!standable[i][s]) continue;
          const [x, y] = open[s];
          let nearest = Number.POSITIVE_INFINITY;
          for (let j = 0; j < count; j++) {
            if (j === i) continue;
            nearest = Math.min(nearest, Math.hypot(at[j].x - x, at[j].y - y));
          }
          if (nearest <= emptiest) continue;
          emptiest = nearest;
          best = open[s];
        }
        if (!best) continue;
        at[i].x = best[0];
        at[i].y = best[1];
      }

      setSpots(at.map((one) => ({ x: one.x - one.width / 2, y: one.y - one.height / 2 })));
    };

    place();
    window.addEventListener("resize", place);
    // The words are not all there at once: the guess at a mistyped address
    // arrives after the page has been looked up, and a link dealt out before
    // it turns up would be left sitting underneath it.
    const main = document.querySelector("main");
    let soon = 0;
    const again = () => {
      window.cancelAnimationFrame(soon);
      soon = window.requestAnimationFrame(place);
    };
    // Watching for the line to turn up rather than for the page to change
    // size: the page is as tall as the window whatever is written on it.
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

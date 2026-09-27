import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { type PageBox, PageLayer, pageBox } from "../PageLayer";
import { Haystack, Needle } from "./Haystack";

const CLICKS_PER_STACK = 3;
const SIZE = 46;
const SHRINK_PER_CLICK = 0.22;
/** Offsets of the bales in the pile, back row first so the front overlaps it. */
const PILE = [
  { x: 34, y: 0 },
  { x: 98, y: 6 },
  { x: 160, y: 1 },
  { x: 0, y: 46 },
  { x: 62, y: 52 },
  { x: 126, y: 48 },
  { x: 188, y: 53 },
];
const CLUSTER_W = Math.max(...PILE.map((p) => p.x)) + SIZE;
const CLUSTER_H = Math.max(...PILE.map((p) => p.y)) + SIZE;
/** How far a bale may slide from its place in the pile to dodge the text. */
const NUDGE = 26;
// Free space a haystack keeps around every piece of text it sits next to.
const CLEARANCE = 10;
// Places tried for the pile; the one that fits the most bales wins.
const TRIES = 200;
const GUTTER = 8;

type Straw = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rotate: number;
  hue: number;
};
type Spot = { left: number; top: number };
type Point = { x: number; y: number };

let nextStrawId = 0;

/** Straw pieces pulled off a haystack, flying out and falling. */
function pullStraws(at: Point, count: number, reach: number): Straw[] {
  return Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const distance = reach * (0.5 + Math.random() * 0.5);
    return {
      id: nextStrawId++,
      x: at.x,
      y: at.y,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      rotate: Math.random() * 360,
      hue: 38 + Math.random() * 14,
    };
  });
}

const StrawPiece = ({ straw, onDone }: { straw: Straw; onDone: (id: number) => void }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const spin = straw.rotate + 200 * Math.sign(straw.dx || 1);
    const flight = el.animate(
      [
        { transform: `translate(0, 0) rotate(${straw.rotate}deg)`, opacity: 1 },
        {
          transform: `translate(${straw.dx}px, ${straw.dy}px) rotate(${(straw.rotate + spin) / 2}deg)`,
          opacity: 1,
          offset: 0.45,
        },
        // Gravity: after the burst, every piece drops.
        {
          transform: `translate(${straw.dx * 1.3}px, ${straw.dy + 70}px) rotate(${spin}deg)`,
          opacity: 0,
        },
      ],
      { duration: 850, easing: "cubic-bezier(0.2, 0.6, 0.4, 1)", fill: "forwards" },
    );
    flight.finished.then(() => onDone(straw.id)).catch(() => undefined);
    return () => flight.cancel();
  }, [straw, onDone]);

  return (
    <span
      ref={ref}
      className="absolute h-[3px] w-3 rounded-full"
      style={{ left: straw.x - 6, top: straw.y - 1, background: `hsl(${straw.hue} 85% 62%)` }}
    />
  );
};

/**
 * Every rectangle on the page that a haystack must keep off: each run of text,
 * and the media that text sits among. Text is measured run by run rather than
 * block by block, so the space beside a short line still counts as free.
 */
function collectBlocked(): PageBox[] {
  const blocked: PageBox[] = [];
  const add = (rect: DOMRect) => {
    if (rect.width <= 0 || rect.height <= 0) return;
    blocked.push({
      left: rect.left + window.scrollX - CLEARANCE,
      top: rect.top + window.scrollY - CLEARANCE,
      width: rect.width + CLEARANCE * 2,
      height: rect.height + CLEARANCE * 2,
    });
  };

  const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    // Egg overlays are skipped, so the haystacks already on the page (and the
    // straw flying off them) never count as something to keep clear of.
    acceptNode: (node) =>
      node.nodeValue?.trim() && !node.parentElement?.closest("[data-egg-layer]")
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) add(rect);
  }
  for (const el of document.querySelectorAll("img, svg, video, iframe, canvas, pre, table, hr")) {
    if (el.closest("[data-egg-layer]")) continue;
    add(el.getBoundingClientRect());
  }
  return blocked;
}

const hits = (a: PageBox, b: PageBox) =>
  a.left < b.left + b.width &&
  a.left + a.width > b.left &&
  a.top < b.top + b.height &&
  a.top + a.height > b.top;

/**
 * Drop the pile somewhere in the article, on empty ground: every bale keeps
 * off the text, sliding a little from its place in the pile to do so. The spot
 * that fits the most bales wins, and bales with nowhere to lie are left out.
 */
function pileUp(article: PageBox): Spot[] {
  const blocked = collectBlocked();
  // Bucketed by band, so a candidate is only tested against nearby rectangles.
  const BUCKET = 600;
  const buckets = new Map<number, PageBox[]>();
  for (const rect of blocked) {
    const first = Math.floor(rect.top / BUCKET);
    const last = Math.floor((rect.top + rect.height) / BUCKET);
    for (let b = first; b <= last; b++) {
      const list = buckets.get(b);
      if (list) list.push(rect);
      else buckets.set(b, [rect]);
    }
  }
  const near = (spot: PageBox) => [
    ...(buckets.get(Math.floor(spot.top / BUCKET)) ?? []),
    ...(buckets.get(Math.floor((spot.top + spot.height) / BUCKET)) ?? []),
  ];

  const minLeft = window.scrollX + GUTTER;
  const maxLeft = Math.max(
    minLeft,
    window.scrollX + document.documentElement.clientWidth - SIZE - GUTTER,
  );
  const span = Math.max(0, document.documentElement.clientWidth - CLUSTER_W - GUTTER * 2);
  const depth = Math.max(0, article.height - CLUSTER_H);

  const free = (spot: PageBox, taken: Spot[]) =>
    !near(spot).some((rect) => hits(spot, rect)) &&
    !taken.some((other) => hits(spot, { ...other, width: SIZE, height: SIZE }));

  let best: Spot[] = [];
  for (let attempt = 0; attempt < TRIES && best.length < PILE.length; attempt++) {
    const left = minLeft + Math.random() * span;
    const top = article.top + Math.random() * depth;
    const placed: Spot[] = [];
    for (const at of PILE) {
      for (let nudge = 0; nudge < 12; nudge++) {
        const candidate = {
          // Clamped, so a nudge never pushes a bale off the side of the page.
          left: Math.min(
            maxLeft,
            Math.max(minLeft, left + at.x + (Math.random() - 0.5) * 2 * NUDGE),
          ),
          top: top + at.y + (Math.random() - 0.5) * 2 * NUDGE,
          width: SIZE,
          height: SIZE,
        };
        if (!free(candidate, placed)) continue;
        placed.push({ left: candidate.left, top: candidate.top });
        break;
      }
    }
    if (placed.length > best.length) best = placed;
  }
  return best;
}

/**
 * Easter egg for /needlestack: one pile of hay bales, dropped somewhere in the
 * article. Clicking a bale pulls it apart, and one bale of the pile, picked at
 * random on every visit, has the needle in it. They lie together, so finding
 * the pile at all is the hard part, not counting bales down a long page.
 */
const NeedleEgg = ({ container }: { container: React.RefObject<HTMLElement | null> }) => {
  const reduceMotion = useReducedMotion();
  const recordFind = useRecordEggFind();
  const [needleIn] = useState(() => Math.floor(Math.random() * PILE.length));
  const [spots, setSpots] = useState<Spot[] | null>(null);
  // Clicks land faster than React commits, so the count lives in a ref and the
  // state only mirrors it for rendering.
  const pulledRef = useRef<Record<number, number>>({});
  const [pulled, setPulled] = useState<Record<number, number>>({});
  const [straws, setStraws] = useState<Straw[]>([]);
  const foundRef = useRef(false);

  // Placement reads the finished layout, so it runs once the fonts and images
  // have settled, and again whenever the text reflows.
  useEffect(() => {
    // A timer rather than an animation frame: a background tab never paints,
    // and the haystacks should be in place by the time the reader looks.
    let timer = 0;
    const measure = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const box = container.current && pageBox(container.current);
        // A hidden tab reports every element as zero-sized, and placing the
        // haystacks against that would pile them all up in the corner. Wait
        // for the layout the reader will actually see.
        if (!box || box.height === 0) return;
        setSpots(pileUp(box));
      }, 120);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    document.addEventListener("visibilitychange", measure);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
      document.removeEventListener("visibilitychange", measure);
    };
  }, [container]);

  const dropStraw = useCallback(
    (id: number) => setStraws((current) => current.filter((s) => s.id !== id)),
    [],
  );

  if (!spots) return null;

  // Bales with nowhere to lie drop out, so the needle is one of the ones placed.
  const needleAt = spots.length > 0 ? needleIn % spots.length : -1;

  const pull = (index: number) => {
    if ((pulledRef.current[index] ?? 0) >= CLICKS_PER_STACK) return;
    const at = spots[index];
    const center = { x: at.left + SIZE / 2, y: at.top + SIZE / 2 };
    const clicks = (pulledRef.current[index] ?? 0) + 1;
    pulledRef.current = { ...pulledRef.current, [index]: clicks };
    setPulled(pulledRef.current);

    const done = clicks >= CLICKS_PER_STACK;
    if (!reduceMotion) {
      setStraws((current) => [
        ...current.slice(-70),
        ...pullStraws(center, done ? 26 : 10, done ? 110 : 60),
      ]);
    }
    if (done && index === needleAt && !foundRef.current) {
      foundRef.current = true;
      recordFind("needle");
    }
  };

  return (
    <PageLayer>
      {spots.map((spot, index) => {
        const clicks = pulled[index] ?? 0;
        const gone = clicks >= CLICKS_PER_STACK;
        const isNeedle = gone && index === needleAt;
        const at = spot;
        return (
          <motion.button
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed pile of bales
            key={index}
            type="button"
            aria-label={isNeedle ? "Needle" : "Haystack"}
            // Stops a burst of clicks from selecting the article text underneath.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => pull(index)}
            className="pointer-events-auto absolute cursor-pointer touch-manipulation select-none appearance-none border-0 bg-transparent p-0 leading-none"
            style={{ left: at.left, top: at.top, width: SIZE, transformOrigin: "50% 100%" }}
            animate={{
              scale: isNeedle ? 1 : gone ? 0 : 1 - clicks * SHRINK_PER_CLICK,
              opacity: gone && !isNeedle ? 0 : 1,
              rotate: isNeedle ? -8 : 0,
            }}
            transition={
              reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 420, damping: 16 }
            }
          >
            {isNeedle ? <Needle size={SIZE} /> : <Haystack size={SIZE} />}
          </motion.button>
        );
      })}
      {straws.map((straw) => (
        <StrawPiece key={straw.id} straw={straw} onDone={dropStraw} />
      ))}
    </PageLayer>
  );
};

export default NeedleEgg;

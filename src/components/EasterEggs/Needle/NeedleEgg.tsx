import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { type PageBox, PageLayer, pageBox } from "../PageLayer";

const HAYSTACKS = 10;
const CLICKS_PER_STACK = 5;
const SIZE = 28;
const SHRINK_PER_CLICK = 0.15;
// Free space a haystack keeps around every piece of text it sits next to.
const CLEARANCE = 10;
// Candidates tried per haystack before that band is left empty.
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
 * Spread the haystacks down the article, one per band so they never pile up,
 * and only where nothing is written: the margins beside the column and the
 * gaps between blocks. A band with no free spot is left empty rather than
 * covering a line of text.
 */
function scatter(article: PageBox): Spot[] {
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
  const span = Math.max(0, document.documentElement.clientWidth - SIZE - GUTTER * 2);
  const bandHeight = Math.max(0, article.height - SIZE) / HAYSTACKS;
  const spots: Spot[] = [];

  for (let i = 0; i < HAYSTACKS; i++) {
    for (let attempt = 0; attempt < TRIES; attempt++) {
      const candidate = {
        left: minLeft + Math.random() * span,
        top: article.top + (i + Math.random()) * bandHeight,
        width: SIZE,
        height: SIZE,
      };
      if (near(candidate).some((rect) => hits(candidate, rect))) continue;
      if (spots.some((other) => hits(candidate, { ...other, width: SIZE, height: SIZE }))) continue;
      spots.push({ left: candidate.left, top: candidate.top });
      break;
    }
  }
  return spots;
}

/**
 * Easter egg for /needlestack: haystacks are scattered down the page. Clicking
 * one pulls the hay apart, and one of them, picked at random on every visit,
 * has the needle in it.
 */
const NeedleEgg = ({ container }: { container: React.RefObject<HTMLElement | null> }) => {
  const reduceMotion = useReducedMotion();
  const recordFind = useRecordEggFind();
  const [needleIn] = useState(() => Math.floor(Math.random() * HAYSTACKS));
  const [spots, setSpots] = useState<Spot[] | null>(null);
  const [pulled, setPulled] = useState<Record<number, number>>({});
  const [straws, setStraws] = useState<Straw[]>([]);
  const [found, setFound] = useState(false);

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
        setSpots(scatter(box));
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

  // Bands with no free space drop out, so the needle is one of the ones placed.
  const needleAt = spots.length > 0 ? needleIn % spots.length : -1;

  const pull = (index: number) => {
    const at = spots[index];
    const center = { x: at.left + SIZE / 2, y: at.top + SIZE / 2 };
    const clicks = (pulled[index] ?? 0) + 1;
    setPulled((current) => ({ ...current, [index]: clicks }));

    const done = clicks >= CLICKS_PER_STACK;
    if (!reduceMotion) {
      setStraws((current) => [
        ...current.slice(-70),
        ...pullStraws(center, done ? 24 : 8, done ? 110 : 60),
      ]);
    }
    if (done && index === needleAt && !found) {
      setFound(true);
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
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed number of haystacks
            key={index}
            type="button"
            aria-label={isNeedle ? "Needle" : "Haystack"}
            onClick={() => !gone && pull(index)}
            className="pointer-events-auto absolute cursor-pointer appearance-none border-0 bg-transparent p-0 text-center leading-none"
            style={{ left: at.left, top: at.top, width: SIZE, height: SIZE, fontSize: SIZE - 6 }}
            animate={{
              scale: isNeedle ? 1 : gone ? 0 : 1 - clicks * SHRINK_PER_CLICK,
              opacity: gone && !isNeedle ? 0 : 1,
              rotate: isNeedle ? -14 : 0,
            }}
            transition={
              reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 420, damping: 16 }
            }
          >
            {isNeedle ? "🪡" : "🌾"}
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

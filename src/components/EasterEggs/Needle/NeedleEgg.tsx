import clsx from "clsx";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { Haystack } from "./Haystack";
import { HolyNeedle } from "./HolyNeedle";
import { BALE_H, PILE, PILE_H, PILE_W, SIZE } from "./pile";

const CLICKS_PER_STACK = 3;
const SHRINK_PER_CLICK = 0.22;
/** How far around the pile a missed click still selects no text. */
const MISS_MARGIN = 32;
/** Once the needle is out, the rest of the pile bursts, nearest bale first. */
const BURST_AFTER = 250;
const BURST_STAGGER = 70;
/** From the find until the needle has faded and the pile is cleared away. */
const SHOW_MS = 5000;
/** How far above the middle of the pile the needle hovers. */
const LIFT = 10;

type Straw = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rotate: number;
  hue: number;
};
type Point = { x: number; y: number };

let nextStrawId = 0;

/** Straw pieces pulled off a haystack, flying out and falling. */
function pullStraws(at: Point, count: number, reach: number, spread = Math.PI * 1.4): Straw[] {
  return Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spread;
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

const middleOf = (index: number): Point => ({
  x: PILE[index].x + SIZE / 2,
  y: PILE[index].y + BALE_H / 2,
});

/**
 * The interactive pile. Clicking a bale pulls it apart, and one bale, picked
 * at random on every visit, has the needle in it. Finding it bursts the rest
 * of the pile, and the needle rises into the middle of where it stood.
 */
const NeedleEgg = () => {
  const reduceMotion = useReducedMotion();
  const recordFind = useRecordEggFind();
  const rootRef = useRef<HTMLDivElement>(null);
  const [needleAt] = useState(() => Math.floor(Math.random() * PILE.length));
  // Clicks land faster than React commits, so the count lives in a ref and the
  // state only mirrors it for rendering.
  const pulledRef = useRef<Record<number, number>>({});
  const [pulled, setPulled] = useState<Record<number, number>>({});
  const [burst, setBurst] = useState<Record<number, boolean>>({});
  const [straws, setStraws] = useState<Straw[]>([]);
  const [found, setFound] = useState(false);
  const [cleared, setCleared] = useState(false);
  const foundRef = useRef(false);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer);
    },
    [],
  );

  // Pulling hay apart takes quick clicks, and one that misses a bale lands on
  // the text beside the pile, where a double click would select a word. Near
  // the pile, a press starts no selection.
  useEffect(() => {
    if (cleared) return;
    const onMouseDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root || event.button !== 0) return;
      const box = root.getBoundingClientRect();
      // A page may place a second pile for other screen widths; the hidden
      // one has no box and guards nothing.
      if (box.width === 0) return;
      if (
        event.clientX < box.left - MISS_MARGIN ||
        event.clientX > box.right + MISS_MARGIN ||
        event.clientY < box.top - MISS_MARGIN ||
        event.clientY > box.bottom + MISS_MARGIN
      ) {
        return;
      }
      // A field next to the pile must still take focus.
      if ((event.target as Element).closest?.("input, textarea, select, [contenteditable]")) return;
      event.preventDefault();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [cleared]);

  const dropStraw = useCallback(
    (id: number) => setStraws((current) => current.filter((s) => s.id !== id)),
    [],
  );

  const scatter = (more: Straw[]) => setStraws((current) => [...current.slice(-200), ...more]);

  const later = (ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms));
  };

  const find = (index: number) => {
    foundRef.current = true;
    setFound(true);
    recordFind("needle");
    const from = middleOf(index);
    const away = (i: number) => Math.hypot(middleOf(i).x - from.x, middleOf(i).y - from.y);
    PILE.map((_, i) => i)
      .filter((i) => i !== index && (pulledRef.current[i] ?? 0) < CLICKS_PER_STACK)
      .sort((a, b) => away(a) - away(b))
      .forEach((i, order) => {
        later(BURST_AFTER + order * BURST_STAGGER, () => {
          setBurst((current) => ({ ...current, [i]: true }));
          if (!reduceMotion) scatter(pullStraws(middleOf(i), 30, 130, Math.PI * 2));
        });
      });
    later(SHOW_MS, () => setCleared(true));
  };

  const pull = (index: number) => {
    const clicks = (pulledRef.current[index] ?? 0) + 1;
    if (foundRef.current || clicks > CLICKS_PER_STACK) return;
    pulledRef.current = { ...pulledRef.current, [index]: clicks };
    setPulled(pulledRef.current);

    const done = clicks === CLICKS_PER_STACK;
    if (!reduceMotion) scatter(pullStraws(middleOf(index), done ? 26 : 10, done ? 110 : 60));
    if (done && index === needleAt) find(index);
  };

  if (cleared) return null;

  return (
    <div ref={rootRef} className="absolute inset-0">
      {PILE.map((at, index) => {
        // The found needle leaves its bale behind and rises on its own.
        if (found && index === needleAt) return null;
        const clicks = pulled[index] ?? 0;
        const gone = clicks >= CLICKS_PER_STACK;
        const scale = 1 - clicks * SHRINK_PER_CLICK;
        const tilt = index % 2 ? 16 : -16;
        return (
          // The button keeps its full size while the hay inside shrinks, so a
          // quick run of clicks at the top of a bale still lands on it. Once the
          // hay is gone, or the needle found, the empty box takes no clicks.
          <button
            key={`${at.x}-${at.y}`}
            type="button"
            aria-label="Haystack"
            onClick={() => pull(index)}
            className={clsx(
              "absolute cursor-pointer touch-manipulation appearance-none border-0 bg-transparent p-0 leading-none",
              (gone || found) && "pointer-events-none",
            )}
            style={{ left: at.x, top: at.y, width: SIZE }}
          >
            <motion.span
              className="block"
              style={{ transformOrigin: "50% 100%" }}
              animate={
                burst[index]
                  ? reduceMotion
                    ? { opacity: 0 }
                    : {
                        scale: [scale, scale + 0.3, 0],
                        rotate: [0, tilt, tilt],
                        opacity: [1, 1, 0],
                      }
                  : { scale: gone ? 0 : scale, opacity: gone ? 0 : 1 }
              }
              transition={
                reduceMotion
                  ? { duration: 0.2 }
                  : burst[index]
                    ? { duration: 0.36, times: [0, 0.3, 1], ease: "easeOut" }
                    : { type: "spring", stiffness: 420, damping: 16 }
              }
            >
              <Haystack size={SIZE} />
            </motion.span>
          </button>
        );
      })}
      {straws.map((straw) => (
        <StrawPiece key={straw.id} straw={straw} onDone={dropStraw} />
      ))}
      {found && (
        <HolyNeedle
          from={PILE[needleAt]}
          to={{ x: (PILE_W - SIZE) / 2, y: (PILE_H - BALE_H) / 2 - LIFT }}
          startScale={1 - (CLICKS_PER_STACK - 1) * SHRINK_PER_CLICK}
          reduceMotion={!!reduceMotion}
        />
      )}
    </div>
  );
};

export default NeedleEgg;

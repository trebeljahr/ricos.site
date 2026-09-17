import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { PageLayer, pageBox } from "../PageLayer";

const HAYSTACKS = 10;
const CLICKS_PER_STACK = 5;
const SIZE = 28;
const SHRINK_PER_CLICK = 0.15;

type Straw = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rotate: number;
  hue: number;
};
type Spot = { fx: number; fy: number };
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

/** Spread the haystacks down the article, a few per band so they never pile up. */
function scatter(): Spot[] {
  return Array.from({ length: HAYSTACKS }, (_, i) => ({
    fx: 0.04 + Math.random() * 0.9,
    fy: (i + 0.15 + Math.random() * 0.7) / HAYSTACKS,
  }));
}

/**
 * Easter egg for /needlestack: haystacks are scattered down the page. Clicking
 * one pulls the hay apart, and one of them, picked at random on every visit,
 * has the needle in it.
 */
const NeedleEgg = ({ container }: { container: React.RefObject<HTMLElement | null> }) => {
  const reduceMotion = useReducedMotion();
  const recordFind = useRecordEggFind();
  const [spots] = useState(scatter);
  const [needleIn] = useState(() => Math.floor(Math.random() * HAYSTACKS));
  const [box, setBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [pulled, setPulled] = useState<Record<number, number>>({});
  const [straws, setStraws] = useState<Straw[]>([]);
  const [found, setFound] = useState(false);

  // Haystacks sit at fractions of the article box, so they follow its layout.
  useEffect(() => {
    const measure = () => container.current && setBox(pageBox(container.current));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [container]);

  const dropStraw = useCallback(
    (id: number) => setStraws((current) => current.filter((s) => s.id !== id)),
    [],
  );

  if (!box) return null;

  const place = (spot: Spot) => ({
    left: box.left + spot.fx * Math.max(0, box.width - SIZE),
    top: box.top + spot.fy * Math.max(0, box.height - SIZE),
  });

  const pull = (index: number) => {
    const at = place(spots[index]);
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
    if (done && index === needleIn && !found) {
      setFound(true);
      recordFind("needle");
    }
  };

  return (
    <PageLayer>
      {spots.map((spot, index) => {
        const clicks = pulled[index] ?? 0;
        const gone = clicks >= CLICKS_PER_STACK;
        const isNeedle = gone && index === needleIn;
        const at = place(spot);
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

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { clampPageX, PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

const CLICK_WINDOW_MS = 2000;
const SHRINK_PER_CLICK = 0.13;
// The stack of needles fans out from the first one.
const STACK_ANGLES = [-38, -19, 19, 38];

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

/** Straw pieces pulled off the haystack, flying out and falling. */
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

const NeedleEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const hayRef = useRef<HTMLSpanElement>(null);
  const regrow = useRef<number | undefined>(undefined);
  const [pulled, setPulled] = useState(0);
  const [straws, setStraws] = useState<Straw[]>([]);
  const [found, setFound] = useState<{ caption: Point } | null>(null);

  useEffect(() => () => window.clearTimeout(regrow.current), []);

  const center = (): Point | null => {
    if (!hayRef.current) return null;
    const b = pageBox(hayRef.current);
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  };

  const throwStraws = (count: number, reach: number) => {
    const at = center();
    if (!at || reduceMotion) return;
    setStraws((current) => [...current.slice(-60), ...pullStraws(at, count, reach)]);
  };

  const dropStraw = useCallback(
    (id: number) => setStraws((current) => current.filter((s) => s.id !== id)),
    [],
  );

  const registerClick = useEasterEgg("needle", {
    // Each click pulls some hay off; stop clicking and the stack grows back.
    onProgress: (clicks) => {
      setPulled(clicks);
      throwStraws(8, 60);
      window.clearTimeout(regrow.current);
      regrow.current = window.setTimeout(() => setPulled(0), CLICK_WINDOW_MS);
    },
    onTrigger: () =>
      run(async () => {
        window.clearTimeout(regrow.current);
        throwStraws(28, 110);
        const hay = hayRef.current ? pageBox(hayRef.current) : null;
        const captionWidth = 190;
        setFound({
          caption: hay
            ? {
                x: clampPageX(hay.left + hay.width / 2 - captionWidth / 2, captionWidth),
                y: hay.top + hay.height + 12,
              }
            : { x: 0, y: 0 },
        });
        await wait(4200);
        setFound(null);
        setPulled(0);
        await wait(500);
      }),
  });

  const stackOut = found !== null;

  return (
    <>
      <EmojiButton
        label="Haystack"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={hayRef} className="relative inline-block">
          <motion.span
            className="inline-block origin-bottom"
            animate={{
              scale: stackOut ? 0 : 1 - pulled * SHRINK_PER_CLICK,
              opacity: stackOut ? 0 : 1,
            }}
            transition={
              reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 20 }
            }
          >
            🌾
          </motion.span>
          <AnimatePresence>
            {stackOut && (
              <motion.span
                key="needles"
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
              >
                {[0, ...STACK_ANGLES].map((angle, i) => (
                  <motion.span
                    key={angle}
                    className="absolute inline-block origin-bottom"
                    initial={
                      reduceMotion
                        ? { rotate: angle, opacity: 0 }
                        : {
                            rotate: 0,
                            scale: i === 0 ? 0 : 1,
                            opacity: i === 0 ? 1 : 0,
                            y: i === 0 ? 20 : 0,
                          }
                    }
                    animate={{ rotate: angle, scale: 1, opacity: 1, y: 0 }}
                    transition={
                      reduceMotion
                        ? { duration: 0.2 }
                        : i === 0
                          ? { type: "spring", stiffness: 420, damping: 12 }
                          : { type: "spring", stiffness: 300, damping: 14, delay: 0.55 + i * 0.08 }
                    }
                  >
                    🪡
                  </motion.span>
                ))}
                {!reduceMotion && (
                  <motion.span
                    className="absolute -top-[0.35em] -right-[0.45em] inline-block text-[0.5em]"
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: [0, 1.3, 0], rotate: 90 }}
                    transition={{ duration: 0.8, delay: 0.25 }}
                  >
                    ✨
                  </motion.span>
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </EmojiButton>
      <PageLayer>
        {straws.map((straw) => (
          <StrawPiece key={straw.id} straw={straw} onDone={dropStraw} />
        ))}
        <AnimatePresence>
          {found && (
            <motion.span
              key="caption"
              role="status"
              className="absolute w-[190px] rounded-full bg-amber-100 px-3 py-1 text-center text-sm font-normal text-amber-900 shadow-md dark:bg-amber-900 dark:text-amber-100"
              style={{ left: found.caption.x, top: found.caption.y }}
              initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: reduceMotion ? 0 : 0.9, duration: 0.3 }}
            >
              You found the needle.
            </motion.span>
          )}
        </AnimatePresence>
      </PageLayer>
    </>
  );
};

export default NeedleEgg;

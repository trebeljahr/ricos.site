import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { clampPageX, PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

const CLICKS = 8;
// Eight quick clicks need more room than the usual two seconds.
const CLICK_WINDOW_MS = 5000;
const SKY_HEIGHT = 54;
const SKY_WIDTH = 340;
const CROSS_MS = 2300;
const TREE_MS = 2600;

// One goes over for every click: days and nights passing while you water.
const SKY_BODIES = ["☀️", "☁️", "🌙", "☁️", "☀️", "☁️", "🌙", "☁️"];

type Sky = { left: number; top: number; width: number };
type Body = { id: number; emoji: string; arc: number };
type Pour = { id: number; drops: { dx: number; delay: number }[] };

const DROPS_PER_POUR = 4;

/**
 * Easter egg on the newsletter form: watering the seedling sends a sun, a
 * cloud or a moon across the sky above the heading. After eight waterings
 * the seedling has grown into a tree.
 */
const SaplingEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const plantRef = useRef<HTMLSpanElement>(null);
  const [grown, setGrown] = useState(false);
  const [pours, setPours] = useState<Pour[]>([]);
  const [sky, setSky] = useState<Sky | null>(null);
  const [bodies, setBodies] = useState<Body[]>([]);

  const pourDone = useCallback(
    (id: number) => setPours((current) => current.filter((p) => p.id !== id)),
    [],
  );
  const bodyDone = useCallback(
    (id: number) => setBodies((current) => current.filter((b) => b.id !== id)),
    [],
  );

  // The sky sits right above the heading, and is measured when watering starts.
  const openSky = useCallback(() => {
    if (!plantRef.current) return null;
    const plant = pageBox(plantRef.current);
    const width = Math.min(SKY_WIDTH, document.documentElement.clientWidth - 24);
    const next = {
      left: clampPageX(plant.left + plant.width / 2 - width / 2, width),
      top: plant.top - SKY_HEIGHT - 4,
      width,
    };
    setSky(next);
    return next;
  }, []);

  const water = useCallback(
    (index: number) => {
      const id = Date.now() + index;
      setPours((current) => [
        ...current,
        {
          id,
          drops: Array.from({ length: DROPS_PER_POUR }, (_, i) => ({
            dx: -0.15 + i * 0.12 + Math.random() * 0.08,
            delay: i * 0.07 + Math.random() * 0.05,
          })),
        },
      ]);
      if (reduceMotion) return;
      openSky();
      setBodies((current) => [
        ...current,
        { id, emoji: SKY_BODIES[index % SKY_BODIES.length], arc: 8 + (index % 3) * 9 },
      ]);
    },
    [openSky, reduceMotion],
  );

  const registerClick = useEasterEgg("sapling", {
    clicks: CLICKS,
    windowMs: CLICK_WINDOW_MS,
    onProgress: (clicks) => water(clicks - 1),
    onTrigger: () =>
      run(async () => {
        water(CLICKS - 1);
        setGrown(true);
        plantRef.current?.animate([{ scale: 1 }, { scale: 1.6 }, { scale: 1.3 }], {
          duration: 700,
          easing: "ease-out",
          fill: "forwards",
        });
        await wait(TREE_MS);
        plantRef.current?.animate([{ scale: 1.3 }, { scale: 1 }], {
          duration: 400,
          easing: "ease-in-out",
          fill: "forwards",
        });
        setGrown(false);
        setSky(null);
        await wait(400);
      }),
  });

  return (
    <>
      <EmojiButton
        label="Seedling"
        nudge={false}
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={plantRef} className="inline-block origin-bottom">
          {grown ? "🌳" : "🌱"}
        </span>
        <AnimatePresence>
          {pours.map((pour) => (
            <span key={pour.id} aria-hidden="true" className="pointer-events-none">
              {/* The can tips in over the plant while it pours. */}
              <motion.span
                className="absolute -top-[1.15em] -left-[0.75em] text-[0.62em] leading-none"
                initial={{ opacity: 0, rotate: 0, y: 4 }}
                animate={{ opacity: [0, 1, 1, 0], rotate: [-5, -32, -32, -5], y: 0 }}
                transition={{ duration: 1, times: [0, 0.25, 0.7, 1], ease: "easeOut" }}
                onAnimationComplete={() => pourDone(pour.id)}
              >
                🫗
              </motion.span>
              {pour.drops.map((drop) => (
                <motion.span
                  key={drop.delay}
                  className="absolute -top-[0.5em] left-1/4 text-[0.3em] leading-none"
                  initial={{ x: `${drop.dx * 100}%`, y: 0, opacity: 0 }}
                  animate={{ y: "2.6em", opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 + drop.delay, ease: "easeIn" }}
                >
                  💧
                </motion.span>
              ))}
            </span>
          ))}
        </AnimatePresence>
      </EmojiButton>
      {sky && (
        <PageLayer>
          {/* Clipped, so a cloud leaving the strip never widens the page. */}
          <div
            aria-hidden="true"
            className="absolute overflow-hidden text-xl leading-none"
            style={{ left: sky.left, top: sky.top, width: sky.width, height: SKY_HEIGHT }}
          >
            <AnimatePresence>
              {bodies.map((body) => (
                <motion.span
                  key={body.id}
                  className="absolute top-1/2 left-0"
                  initial={{ x: -40, y: 0, opacity: 0 }}
                  animate={{ x: sky.width + 40, y: [0, -body.arc, 0], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: CROSS_MS / 1000, ease: "linear" }}
                  onAnimationComplete={() => bodyDone(body.id)}
                >
                  {body.emoji}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </PageLayer>
      )}
    </>
  );
};

export default SaplingEgg;

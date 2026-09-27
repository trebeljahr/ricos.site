import { Sprite } from "@components/Sprite";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import type { EmojiSprite } from "src/lib/sprites";
import { EmojiButton } from "../EmojiButton";
import { clampPageX, PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

const CLICKS = 5;
// One watering: the can pours and one cloud crosses the sky.
// Clicks during a watering are ignored, so each one plays out in full.
const WATER_MS = 1700;
// Five waterings take at least four lockouts; leave room for unhurried clicks.
const CLICK_WINDOW_MS = 15000;
const SKY_HEIGHT = 54;
const SKY_WIDTH = 340;

// One drifts over for every click: weather passing while you water.
const CLOUD: EmojiSprite = "☁️";
const CLOUD_SIZES = [0.85, 1.05, 0.95, 1.15];

type Sky = { left: number; top: number; width: number };
type Cloud = { id: number; arc: number; scale: number };
type Pour = { id: number; drops: { dx: number; delay: number }[] };

const DROPS_PER_POUR = 4;

/**
 * Easter egg on the newsletter form: watering the seedling sends a cloud
 * drifting across the sky above the heading. After five waterings the
 * seedling has grown into a tree, and it stays one.
 */
const SaplingEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const plantRef = useRef<HTMLSpanElement>(null);
  const [grown, setGrown] = useState(false);
  const [pours, setPours] = useState<Pour[]>([]);
  const [sky, setSky] = useState<Sky | null>(null);
  const [clouds, setClouds] = useState<Cloud[]>([]);

  const pourDone = useCallback(
    (id: number) => setPours((current) => current.filter((p) => p.id !== id)),
    [],
  );
  const cloudDone = useCallback(
    (id: number) => setClouds((current) => current.filter((c) => c.id !== id)),
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
      setClouds((current) => [
        ...current,
        {
          id,
          arc: 8 + (index % 3) * 9,
          scale: CLOUD_SIZES[index % CLOUD_SIZES.length],
        },
      ]);
    },
    [openSky, reduceMotion],
  );

  const registerClick = useEasterEgg("sapling", {
    clicks: CLICKS,
    windowMs: CLICK_WINDOW_MS,
    onProgress: (clicks) =>
      run(async () => {
        water(clicks - 1);
        await wait(WATER_MS);
      }),
    onTrigger: () =>
      run(async () => {
        water(CLICKS - 1);
        setGrown(true);
        plantRef.current?.animate([{ scale: 1 }, { scale: 1.6 }, { scale: 1.3 }], {
          duration: 700,
          easing: "ease-out",
          fill: "forwards",
        });
        await wait(WATER_MS);
        plantRef.current?.animate([{ scale: 1.3 }, { scale: 1 }], {
          duration: 400,
          easing: "ease-in-out",
          fill: "forwards",
        });
        setSky(null);
      }),
  });

  return (
    <>
      {/* Once grown, the tree only wiggles; it is not watered again. */}
      <EmojiButton
        label={grown ? "Tree" : "Seedling"}
        nudge={grown}
        onClick={() => {
          if (!grown && !busyRef.current) registerClick();
        }}
      >
        <span ref={plantRef} className="inline-block origin-bottom">
          <Sprite name={grown ? "🌳" : "🌱"} />
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
                <Sprite name="🫗" />
              </motion.span>
              {pour.drops.map((drop) => (
                <motion.span
                  key={drop.delay}
                  className="absolute -top-[0.5em] left-1/4 text-[0.3em] leading-none"
                  initial={{ x: `${drop.dx * 100}%`, y: 0, opacity: 0 }}
                  animate={{ y: "2.6em", opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 + drop.delay, ease: "easeIn" }}
                >
                  <Sprite name="💧" />
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
              {clouds.map((cloud) => (
                <motion.span
                  key={cloud.id}
                  className="absolute top-1/2 left-0"
                  initial={{ x: -40, y: 0, opacity: 0, scale: cloud.scale }}
                  animate={{
                    x: sky.width + 40,
                    y: [0, -cloud.arc, 0],
                    opacity: [0, 1, 1, 0],
                    scale: cloud.scale,
                  }}
                  transition={{ duration: WATER_MS / 1000, ease: "linear" }}
                  onAnimationComplete={() => cloudDone(cloud.id)}
                >
                  <Sprite name={CLOUD} />
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

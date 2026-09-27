import { Sprite } from "@components/Sprite";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import { useCallback, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import type { EmojiSprite } from "src/lib/sprites";
import { EmojiButton } from "../EmojiButton";
import { clampPageX, PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

const CLICKS = 5;
// One watering: the can pours while a day, or a night in dark mode, passes.
// Clicks during a watering are ignored, so each one plays out in full.
const WATER_MS = 1700;
// Five waterings take at least four lockouts; leave room for unhurried clicks.
const CLICK_WINDOW_MS = 15000;
// The newsletter card has 44px above the heading line; the sky fills it and no more.
const SKY_HEIGHT = 40;
const SKY_WIDTH = 340;
// The sun or moon rises and sets on the bottom edge of the sky, the horizon.
const ARC_WIDTH = 140;
const ARC_HEIGHT = 24;
const ARC_STEPS = 12;
// Shaking the grown tree hard enough drops an apple, one at a time.
const APPLE_CLICKS = 5;
const APPLE_WINDOW_MS = 1500;
const APPLE_MS = 2600;
const APPLE_ROLL = 64;

type Sky = { left: number; top: number; width: number; plantX: number };
type Cloud = { from: number; to: number; y: number; scale: number; delay: number };
type Day = { id: number; body: EmojiSprite; night: boolean; clouds: Cloud[] };
type Pour = { id: number; drops: { dx: number; delay: number }[] };
type Apple = { id: number; left: number; top: number; size: number; drop: number; roll: number };

const DROPS_PER_POUR = 4;

/**
 * Easter egg on the newsletter form: every watering passes one day over the
 * seedling, a sun arching across the sky above the heading while clouds drift
 * by. In dark mode it is a night with the moon. After five waterings the
 * seedling has grown into a tree, and it stays one. Shake the tree with a
 * burst of quick clicks and an apple falls out and rolls away.
 */
const SaplingEgg = () => {
  const reduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();
  const { run, wait, busyRef } = useEggRunner();
  const plantRef = useRef<HTMLSpanElement>(null);
  const [grown, setGrown] = useState(false);
  const [pours, setPours] = useState<Pour[]>([]);
  const [sky, setSky] = useState<Sky | null>(null);
  const [day, setDay] = useState<Day | null>(null);
  const [apple, setApple] = useState<Apple | null>(null);
  const shakes = useRef<number[]>([]);

  const pourDone = useCallback(
    (id: number) => setPours((current) => current.filter((p) => p.id !== id)),
    [],
  );
  const dayDone = useCallback(
    (id: number) => setDay((current) => (current?.id === id ? null : current)),
    [],
  );

  // The sky sits right above the heading, and is measured when watering starts.
  // Measured from the heading, not the plant, so a wrapped heading stays clear.
  const openSky = useCallback(() => {
    if (!plantRef.current) return null;
    const plant = pageBox(plantRef.current);
    const heading = pageBox(plantRef.current.closest("h1, h2, h3") ?? plantRef.current);
    const width = Math.min(SKY_WIDTH, document.documentElement.clientWidth - 24);
    const center = plant.left + plant.width / 2;
    const left = clampPageX(center - width / 2, width);
    const next = { left, top: heading.top - SKY_HEIGHT - 4, width, plantX: center - left };
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
      const night = resolvedTheme === "dark";
      // Two clouds, one high and small, one low and big, drifting slower than the sun.
      const drift = (from: number, y: number, scale: number, delay: number) => ({
        from: from + Math.random() * 0.1,
        to: from + 0.45 + Math.random() * 0.1,
        y: y + Math.random() * 4,
        scale: scale + Math.random() * 0.15,
        delay,
      });
      setDay({
        id,
        body: night ? "🌙" : "☀️",
        night,
        clouds: [drift(0.02, 15, 0.75, 0), drift(0.4, 25, 1, 0.25)],
      });
    },
    [openSky, reduceMotion, resolvedTheme],
  );

  const shakeTree = () => {
    if (busyRef.current || apple || !plantRef.current) return;
    const now = Date.now();
    shakes.current = [...shakes.current.filter((t) => now - t < APPLE_WINDOW_MS), now];
    if (shakes.current.length < APPLE_CLICKS) return;
    shakes.current = [];
    // Falls from the crown to the foot of the trunk, then rolls away from the heading text.
    const tree = pageBox(plantRef.current);
    const size = Math.round(tree.height * 0.4);
    const left = tree.left + tree.width * 0.55 - size / 2;
    const top = tree.top + tree.height * 0.15;
    const room = window.scrollX + document.documentElement.clientWidth - (left + size) - 12;
    setApple({
      id: now,
      left,
      top,
      size,
      drop: tree.height * 0.85 - size,
      roll: room >= 40 ? Math.min(APPLE_ROLL, room) : -APPLE_ROLL,
    });
  };

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
      {/* Once grown, the tree is not watered again; clicks shake it instead. */}
      <EmojiButton
        label={grown ? "Tree" : "Seedling"}
        nudge={grown}
        onClick={() => {
          if (grown) shakeTree();
          else if (!busyRef.current) registerClick();
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
          {/* Clipped, so the sun sets below the horizon and nothing widens the page. */}
          <div
            aria-hidden="true"
            className="absolute overflow-hidden text-xl leading-none"
            style={{ left: sky.left, top: sky.top, width: sky.width, height: SKY_HEIGHT }}
          >
            {day && <DayPass key={day.id} day={day} sky={sky} onDone={() => dayDone(day.id)} />}
          </div>
        </PageLayer>
      )}
      {apple && (
        <PageLayer>
          <FallingApple key={apple.id} apple={apple} onDone={() => setApple(null)} />
        </PageLayer>
      )}
    </>
  );
};

/** One sun or moon arching over the plant from horizon to horizon, clouds in front. */
const DayPass = ({ day, sky, onDone }: { day: Day; sky: Sky; onDone: () => void }) => {
  const rx = Math.min(ARC_WIDTH, sky.width / 2 - 16);
  const angles = Array.from({ length: ARC_STEPS + 1 }, (_, i) => Math.PI * (1 - i / ARC_STEPS));
  return (
    <>
      <motion.span
        className="absolute top-0 left-0 -mt-2.5 -ml-2.5"
        initial={{ x: sky.plantX - rx, y: SKY_HEIGHT + 4, opacity: 0 }}
        animate={{
          x: angles.map((a) => sky.plantX + rx * Math.cos(a)),
          y: angles.map((a) => SKY_HEIGHT + 4 - ARC_HEIGHT * Math.sin(a)),
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: WATER_MS / 1000,
          ease: "linear",
          opacity: { duration: WATER_MS / 1000, times: [0, 0.1, 0.9, 1] },
        }}
        onAnimationComplete={onDone}
      >
        <Sprite name={day.body} />
      </motion.span>
      {day.clouds.map((cloud) => (
        <motion.span
          key={cloud.delay}
          className="absolute top-0 left-0 -mt-2.5 -ml-2.5"
          initial={{ x: cloud.from * sky.width, y: cloud.y, opacity: 0, scale: cloud.scale }}
          animate={{
            x: cloud.to * sky.width,
            opacity: [0, day.night ? 0.7 : 1, day.night ? 0.7 : 1, 0],
          }}
          transition={{
            duration: WATER_MS / 1000 - cloud.delay,
            delay: cloud.delay,
            ease: "linear",
          }}
        >
          <Sprite name="☁️" />
        </motion.span>
      ))}
    </>
  );
};

/** Drops, bounces once, rolls to a stop and fades. */
const FallingApple = ({ apple, onDone }: { apple: Apple; onDone: () => void }) => {
  const { drop, roll, size } = apple;
  const x = [0, 0, roll * 0.08, roll * 0.2, roll, roll, roll];
  return (
    <motion.span
      aria-hidden="true"
      className="absolute block leading-none"
      style={{ left: apple.left, top: apple.top, fontSize: size }}
      initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
      animate={{
        x,
        y: [0, drop, drop - size * 0.3, drop, drop, drop, drop],
        // Turns as far as it rolls, so it rolls rather than slides.
        rotate: x.map((dx) => (dx / (Math.PI * size)) * 360),
        opacity: [0, 1, 1, 1, 1, 1, 0],
      }}
      transition={{
        duration: APPLE_MS / 1000,
        times: [0, 0.17, 0.23, 0.29, 0.65, 0.8, 1],
        ease: ["easeIn", "easeOut", "easeIn", "easeOut", "linear", "easeIn"],
      }}
      onAnimationComplete={onDone}
    >
      <Sprite name="🍎" />
    </motion.span>
  );
};

export default SaplingEgg;

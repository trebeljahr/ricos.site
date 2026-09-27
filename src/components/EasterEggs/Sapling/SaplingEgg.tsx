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
const SKY_WIDTH = 400;
// Clouds fade in and out at the sides instead of being cut off mid-card.
const SKY_EDGE_FADE = "linear-gradient(to right, transparent, black 12%, black 88%, transparent)";
// The sun or moon rises and sets on the bottom edge of the sky, the horizon,
// moving across at an even pace.
const ARC_WIDTH = 140;
const ARC_RISE = 32;
const ARC_STEPS = 24;
// The clouds scroll by as one layer, a little faster than the sun, so they
// keep their spacing and never run into each other.
const CLOUD_SPEED = 1.25;
// High clouds are small and faint, low ones big and solid, so the sky has depth.
const CLOUD_ROWS = [
  { y: 15, size: 14, opacity: 0.7 },
  { y: 21, size: 18, opacity: 0.85 },
  { y: 28, size: 22, opacity: 1 },
];
// Shaking the grown tree hard enough drops an apple, one at a time.
const APPLE_CLICKS = 5;
const APPLE_WINDOW_MS = 1500;
const APPLE_MS = 2600;
const APPLE_ROLL = 64;

type Sky = { left: number; top: number; width: number; plantX: number };
type Cloud = { x: number; y: number; size: number; opacity: number };
type Day = { id: number; body: EmojiSprite; night: boolean; clouds: Cloud[]; travel: number };
type Pour = { id: number; drops: { dx: number; delay: number }[] };
type Apple = { id: number; left: number; top: number; size: number; drop: number; roll: number };

const DROPS_PER_POUR = 4;

const arcHalfWidth = (sky: Sky) => Math.min(ARC_WIDTH, sky.width / 2 - 16);

/** Clouds along the three rows, with a gap between neighbours. */
function cloudscape(sky: Sky) {
  const travel = 2 * arcHalfWidth(sky) * CLOUD_SPEED;
  const clouds: Cloud[] = [];
  let row = -1;
  // Starts a full scroll to the left, so the sky is as cloudy at the end as at the start.
  for (let x = -travel + Math.random() * 20; x < sky.width; ) {
    // Never the same row as the cloud before, so neighbours read as separate clouds.
    row = (row + 1 + Math.floor(Math.random() * (CLOUD_ROWS.length - 1))) % CLOUD_ROWS.length;
    const { y, size, opacity } = CLOUD_ROWS[row];
    const cloud = { x, y, size: size + Math.random() * 4, opacity };
    clouds.push(cloud);
    x += cloud.size + 12 + Math.random() * 24;
  }
  return { clouds, travel };
}

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
      const next = openSky();
      if (!next) return;
      const night = resolvedTheme === "dark";
      setDay({ id, body: night ? "🌙" : "☀️", night, ...cloudscape(next) });
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
        // The tree keeps the size it grew to.
        await wait(WATER_MS);
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
            style={{
              left: sky.left,
              top: sky.top,
              width: sky.width,
              height: SKY_HEIGHT,
              maskImage: SKY_EDGE_FADE,
            }}
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
  const rx = arcHalfWidth(sky);
  const duration = WATER_MS / 1000;
  const cloudOpacity = day.night ? 0.7 : 1;
  // Starts just below the horizon; a sine keeps the climb and the descent smooth.
  const low = SKY_HEIGHT + 12;
  const heights = Array.from(
    { length: ARC_STEPS + 1 },
    (_, i) => low - ARC_RISE * Math.sin((Math.PI * i) / ARC_STEPS),
  );
  return (
    <>
      <motion.span
        className="absolute top-0 left-0 -mt-2.5 -ml-2.5"
        initial={{ x: sky.plantX - rx, y: low, opacity: 0 }}
        animate={{ x: sky.plantX + rx, y: heights, opacity: [0, 1, 1, 0] }}
        transition={{
          duration,
          ease: "linear",
          opacity: { duration, times: [0, 0.06, 0.94, 1] },
        }}
        onAnimationComplete={onDone}
      >
        <Sprite name={day.body} />
      </motion.span>
      <motion.div
        className="absolute inset-0"
        initial={{ x: 0, opacity: 0 }}
        animate={{ x: day.travel, opacity: [0, cloudOpacity, cloudOpacity, 0] }}
        transition={{
          duration,
          ease: "linear",
          opacity: { duration, times: [0, 0.12, 0.88, 1] },
        }}
      >
        {day.clouds.map((cloud) => (
          <span
            key={cloud.x}
            className="absolute leading-none"
            style={{
              left: cloud.x,
              top: cloud.y - cloud.size / 2,
              fontSize: cloud.size,
              opacity: cloud.opacity,
            }}
          >
            <Sprite name="☁️" />
          </span>
        ))}
      </motion.div>
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

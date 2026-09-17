import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { clampPageX, PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

// Watered once per click: seedling, herb, potted plant, small tree, tree.
const STAGES = ["🌱", "🌿", "🪴", "🌴", "🌳"];
const REGROW_MS = 2600;
const SKY_MS = 4200;
const SKY_HEIGHT = 54;

type Sky = { left: number; top: number; width: number };

/** Sun, clouds and a moon crossing the sky above the heading: time passing. */
const SKY_BODIES = [
  { emoji: "☀️", from: -0.1, to: 1.1, start: 0, duration: 2.6, arc: 22 },
  { emoji: "☁️", from: -0.2, to: 1.2, start: 0.5, duration: 3.2, arc: 4 },
  { emoji: "☁️", from: -0.4, to: 1.1, start: 1.4, duration: 2.8, arc: 10 },
  { emoji: "🌙", from: -0.1, to: 1.1, start: 2.2, duration: 2.2, arc: 18 },
];

const SaplingEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const plantRef = useRef<HTMLSpanElement>(null);
  const regrow = useRef<number | undefined>(undefined);
  const [stage, setStage] = useState(0);
  const [drops, setDrops] = useState<number[]>([]);
  const [sky, setSky] = useState<Sky | null>(null);

  useEffect(() => () => window.clearTimeout(regrow.current), []);

  const water = () => {
    if (reduceMotion) return;
    const id = Date.now();
    setDrops((current) => [...current, id]);
    window.setTimeout(() => setDrops((current) => current.filter((d) => d !== id)), 700);
  };

  const registerClick = useEasterEgg("sapling", {
    // Every click waters the plant one stage further.
    onProgress: (clicks) => {
      setStage(Math.min(clicks, STAGES.length - 2));
      water();
      window.clearTimeout(regrow.current);
      regrow.current = window.setTimeout(() => setStage(0), REGROW_MS);
    },
    onTrigger: () =>
      run(async () => {
        window.clearTimeout(regrow.current);
        water();
        setStage(STAGES.length - 1);
        plantRef.current?.animate([{ scale: 1 }, { scale: 1.5 }, { scale: 1.25 }], {
          duration: 700,
          easing: "ease-out",
          fill: "forwards",
        });

        const plant = plantRef.current ? pageBox(plantRef.current) : null;
        if (plant) {
          const width = Math.min(340, document.documentElement.clientWidth - 24);
          setSky({
            left: clampPageX(plant.left + plant.width / 2 - width / 2, width),
            top: plant.top - SKY_HEIGHT - 4,
            width,
          });
        }
        await wait(reduceMotion ? 2200 : SKY_MS);
        setSky(null);
        plantRef.current?.animate([{ scale: 1.25 }, { scale: 1 }], {
          duration: 400,
          easing: "ease-in-out",
          fill: "forwards",
        });
        await wait(400);
        setStage(0);
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
          {STAGES[stage]}
        </span>
        {drops.map((id) => (
          <motion.span
            key={id}
            aria-hidden="true"
            className="pointer-events-none absolute -top-[0.9em] left-1/4 text-[0.5em] leading-none"
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: "1.6em", opacity: [1, 1, 0] }}
            transition={{ duration: 0.55, ease: "easeIn" }}
          >
            💧
          </motion.span>
        ))}
      </EmojiButton>
      <PageLayer>
        <AnimatePresence>
          {sky && (
            <motion.div
              key="sky"
              aria-hidden="true"
              className="absolute overflow-hidden text-xl leading-none"
              style={{ left: sky.left, top: sky.top, width: sky.width, height: SKY_HEIGHT }}
              exit={{ opacity: 0, transition: { duration: 0.5 } }}
            >
              {SKY_BODIES.map((body, i) => (
                <motion.span
                  // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of sky bodies
                  key={i}
                  className="absolute top-1/2 left-0"
                  initial={
                    reduceMotion
                      ? { x: sky.width * 0.5, y: -10, opacity: 0 }
                      : { x: sky.width * body.from, y: 0, opacity: 0 }
                  }
                  animate={
                    reduceMotion
                      ? { opacity: i === 0 ? 1 : 0 }
                      : {
                          x: sky.width * body.to,
                          y: [0, -body.arc, 0],
                          opacity: [0, 1, 1, 0],
                        }
                  }
                  transition={
                    reduceMotion
                      ? { duration: 0.4 }
                      : { duration: body.duration, delay: body.start, ease: "linear" }
                  }
                >
                  {body.emoji}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </PageLayer>
    </>
  );
};

export default SaplingEgg;

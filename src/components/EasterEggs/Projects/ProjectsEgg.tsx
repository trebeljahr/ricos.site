import { AnimatePresence, motion, useAnimation, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { useEggRunner } from "../useEggRunner";

const WORD = "Projects";
// Fixed per letter rather than random, so every run looks the same pile.
const FALL = [
  { y: 58, rotate: -38 },
  { y: 70, rotate: 22 },
  { y: 50, rotate: -16 },
  { y: 66, rotate: 44 },
  { y: 54, rotate: -28 },
  { y: 74, rotate: 30 },
  { y: 48, rotate: -42 },
  { y: 62, rotate: 18 },
];

type Phase = "idle" | "fallen" | "back";

const letterVariants = {
  idle: { y: 0, rotate: 0 },
  fallen: (i: number) => ({
    ...FALL[i],
    transition: { duration: 0.42, ease: [0.55, 0, 1, 0.45] as const, delay: i * 0.045 },
  }),
  back: (i: number) => ({
    y: 0,
    rotate: 0,
    transition: {
      type: "spring" as const,
      stiffness: 420,
      damping: 11,
      delay: (WORD.length - 1 - i) * 0.04,
    },
  }),
};

const TAPE_STRIPES = "repeating-linear-gradient(-45deg, #facc15 0 0.6em, #1f2937 0.6em 1.2em)";

const ProjectsEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const tools = useAnimation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [tape, setTape] = useState(false);

  const registerClick = useEasterEgg("projects", {
    onTrigger: () =>
      run(async () => {
        if (reduceMotion) {
          setTape(true);
          await wait(1800);
          setTape(false);
          await wait(300);
          return;
        }
        void tools.start({ rotate: [0, -25, 18, -12, 0], transition: { duration: 0.6 } });
        setPhase("fallen");
        await wait(750);
        setTape(true);
        await wait(900);
        setPhase("back");
        await wait(900);
        setTape(false);
        await wait(550);
        setPhase("idle");
      }),
  });

  return (
    <>
      <span className="relative inline-block">
        {phase === "idle" ? (
          WORD
        ) : (
          <>
            <span className="sr-only">{WORD}</span>
            {[...WORD].map((letter, i) => (
              <motion.span
                // biome-ignore lint/suspicious/noArrayIndexKey: the word never changes
                key={i}
                aria-hidden="true"
                className="inline-block"
                custom={i}
                variants={letterVariants}
                initial="idle"
                animate={phase}
              >
                {letter}
              </motion.span>
            ))}
          </>
        )}
        <AnimatePresence>
          {tape && (
            <motion.span
              key="tape"
              aria-hidden="true"
              className="pointer-events-none absolute -right-[0.4em] -left-[0.4em] flex h-[1.6em] items-center justify-between px-[0.3em] text-[0.4em] leading-none shadow-md"
              style={{ top: "calc(50% - 0.8em)", background: TAPE_STRIPES, rotate: -4 }}
              initial={
                reduceMotion ? { opacity: 0 } : { clipPath: "inset(0 100% 0 0)", opacity: 1 }
              }
              animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
              exit={
                reduceMotion
                  ? { opacity: 0 }
                  : {
                      rotate: 14,
                      y: "-1.5em",
                      x: "0.8em",
                      opacity: 0,
                      transition: { duration: 0.5 },
                    }
              }
              transition={{ duration: reduceMotion ? 0.2 : 0.35, ease: "easeOut" }}
            >
              <span>🚧</span>
              <span>🚧</span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>{" "}
      <EmojiButton
        label="Tools"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <motion.span className="inline-block origin-bottom-left" animate={tools}>
          🛠️
        </motion.span>
      </EmojiButton>
    </>
  );
};

export default ProjectsEgg;

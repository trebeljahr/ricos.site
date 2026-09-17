import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { useEggRunner } from "../useEggRunner";

const WORD = "Writing";
const TYPO = "Wrting";
const TYPE_MS = 110;
const BACKSPACE_MS = 70;

// Type the typo, pause, backspace to "Wr", then type the rest correctly.
const KEYSTROKES: { text: string; delay: number }[] = [
  { text: "", delay: 250 },
  ...[...TYPO].map((_, i) => ({ text: TYPO.slice(0, i + 1), delay: TYPE_MS })),
  ...[5, 4, 3, 2].map((len, i) => ({
    text: TYPO.slice(0, len),
    delay: i === 0 ? 450 : BACKSPACE_MS,
  })),
  ...[3, 4, 5, 6, 7].map((len, i) => ({
    text: WORD.slice(0, len),
    delay: i === 0 ? 200 : TYPE_MS,
  })),
];

const SQUIGGLE = "M1 5 C 7 1, 13 9, 20 5 S 33 1, 40 5 S 53 9, 60 5 S 73 1, 80 5 S 93 9, 99 4";

const WritingEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const [typed, setTyped] = useState<string | null>(null);
  const [squiggle, setSquiggle] = useState(false);

  const registerClick = useEasterEgg("writing", {
    onTrigger: () =>
      run(async () => {
        if (!reduceMotion) {
          for (const { text, delay } of KEYSTROKES) {
            await wait(delay);
            setTyped(text);
          }
          await wait(250);
          setTyped(null);
        }
        setSquiggle(true);
        await wait(reduceMotion ? 2000 : 1800);
        setSquiggle(false);
        await wait(400);
      }),
  });

  return (
    <>
      <span className="relative inline-block">
        {/* The real word stays in place (transparent while typing) so width and heading name never change. */}
        <span className={typed === null ? undefined : "text-transparent"}>{WORD}</span>
        {typed !== null && (
          <span aria-hidden="true" className="absolute top-0 left-0 whitespace-nowrap">
            {typed}
            <span className="ml-0.5 inline-block h-[0.85em] w-[0.06em] translate-y-[0.08em] bg-current" />
          </span>
        )}
        <AnimatePresence>
          {squiggle && (
            <motion.svg
              key="squiggle"
              aria-hidden="true"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
              className="text-accent pointer-events-none absolute top-[88%] left-0 h-[0.28em] w-full overflow-visible"
              exit={{ opacity: 0, transition: { duration: 0.4 } }}
            >
              <motion.path
                d={SQUIGGLE}
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: reduceMotion ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>{" "}
      <EmojiButton
        label="Memo"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        📝
      </EmojiButton>
    </>
  );
};

export default WritingEgg;

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

// See no evil, hear no evil, speak no evil: one per click.
const WISE_MONKEYS = ["🙈", "🙉", "🙊"];
const REST_MONKEY = "🙊";
const THROW_MS = 700;
const RESET_MS = 2400;

type Toss = { from: { x: number; y: number }; to: { x: number; y: number } };

const glow = (input: Element) =>
  input.animate(
    [
      { boxShadow: "0 0 0 0 rgba(45, 212, 191, 0)" },
      { boxShadow: "0 0 0 4px rgba(45, 212, 191, 0.7)" },
      { boxShadow: "0 0 0 0 rgba(45, 212, 191, 0)" },
    ],
    { duration: 700, iterations: 2 },
  );

/**
 * Easter egg on the newsletter form: the monkey cycles through the three wise
 * monkeys while you click, then throws a banana that lands on the corner of
 * the email field and stays there.
 */
const MonkeyEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const monkeyRef = useRef<HTMLSpanElement>(null);
  const reset = useRef<number | undefined>(undefined);
  const [monkey, setMonkey] = useState(REST_MONKEY);
  const [toss, setToss] = useState<Toss | null>(null);

  useEffect(() => () => window.clearTimeout(reset.current), []);

  const emailField = useCallback(
    () => monkeyRef.current?.closest("h2")?.parentElement?.querySelector('input[type="email"]'),
    [],
  );

  const registerClick = useEasterEgg("monkey", {
    onProgress: (clicks) => {
      setMonkey(WISE_MONKEYS[clicks % WISE_MONKEYS.length]);
      window.clearTimeout(reset.current);
      reset.current = window.setTimeout(() => setMonkey(REST_MONKEY), RESET_MS);
    },
    onTrigger: () =>
      run(async () => {
        window.clearTimeout(reset.current);
        setMonkey("🐵");
        monkeyRef.current?.animate([{ scale: 1 }, { scale: 1.35 }, { scale: 1 }], {
          duration: 320,
          easing: "ease-out",
        });

        const input = emailField();
        if (input && monkeyRef.current) {
          const monkeyBox = pageBox(monkeyRef.current);
          const field = pageBox(input);
          setToss({
            from: { x: monkeyBox.left + monkeyBox.width / 2, y: monkeyBox.top },
            // Resting on the top left corner of the field.
            to: { x: field.left + 6, y: field.top - 14 },
          });
          await wait(reduceMotion ? 0 : THROW_MS);
          glow(input);
        }
        await wait(1200);
        setMonkey(REST_MONKEY);
      }),
  });

  return (
    <>
      <EmojiButton
        label="Monkey"
        nudge={false}
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={monkeyRef} className="inline-block">
          {monkey}
        </span>
      </EmojiButton>
      {toss && (
        <PageLayer>
          {/* Thrown straight at the field, then left lying there at an angle. */}
          <motion.span
            aria-hidden="true"
            className="absolute text-2xl leading-none"
            style={{ left: toss.to.x, top: toss.to.y }}
            initial={
              reduceMotion
                ? { opacity: 0, rotate: -24 }
                : { x: toss.from.x - toss.to.x, y: toss.from.y - toss.to.y, rotate: 10, opacity: 1 }
            }
            animate={{ x: 0, y: 0, rotate: -24, opacity: 1 }}
            transition={
              reduceMotion
                ? { duration: 0.3 }
                : { duration: THROW_MS / 1000, ease: [0.3, 0.7, 0.5, 1] }
            }
          >
            🍌
          </motion.span>
        </PageLayer>
      )}
    </>
  );
};

export default MonkeyEgg;

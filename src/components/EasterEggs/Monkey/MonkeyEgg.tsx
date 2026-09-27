import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { type PageBox, PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

// See no evil, hear no evil, speak no evil: one per click.
const WISE_MONKEYS = ["🙈", "🙉", "🙊"];
const REST_MONKEY = "🙊";
const THROW_MS = 520;
const STAGGER_MS = 110;
const HOLD_MS = 900;
const CLEAR_MS = 700;
const CLEAR_STAGGER_MS = 30;
const RESET_MS = 2400;

const BANANAS = 20;
/** A banana glyph is ~24px wide and tall, so slots of this size never overlap. */
const SLOT_W = 32;
const ROW_H = 30;
const MAX_ROWS = 2;
const FIRST_X = 6;
const FIRST_Y = -14;

type Banana = { x: number; y: number; rotate: number; delay: number };
type Toss = { from: { x: number; y: number }; bananas: Banana[] };

const glow = (input: Element) =>
  input.animate(
    [
      { boxShadow: "0 0 0 0 rgba(45, 212, 191, 0)" },
      { boxShadow: "0 0 0 4px rgba(45, 212, 191, 0.7)" },
      { boxShadow: "0 0 0 0 rgba(45, 212, 191, 0)" },
    ],
    { duration: 700, iterations: 2 },
  );

const jitter = (amount: number) => (Math.random() * 2 - 1) * amount;

/**
 * Lays the bananas out on a grid over the top of the field, so the throws look
 * scattered but no two emojis ever land on each other. The first one keeps the
 * top left corner; the rest take the remaining slots in random order.
 */
function planBananas(field: PageBox): Banana[] {
  const cols = Math.max(1, Math.floor((field.width - FIRST_X) / SLOT_W));
  const rows = Math.min(MAX_ROWS, Math.ceil(BANANAS / cols));
  const slots: { row: number; col: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) slots.push({ row, col });
  }

  const [first, ...rest] = slots;
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return [first, ...rest].slice(0, BANANAS).map((slot, index) => ({
    x: field.left + FIRST_X + slot.col * SLOT_W + (index === 0 ? 0 : jitter(3)),
    y: field.top + FIRST_Y + slot.row * ROW_H,
    rotate: index === 0 ? -24 : -35 + Math.random() * 60,
    delay: (index * STAGGER_MS) / 1000,
  }));
}

/**
 * Easter egg on the newsletter form: the monkey cycles through the three wise
 * monkeys while you click, then pelts the top of the email field with bananas
 * until it is buried, and sweeps them away again.
 */
const MonkeyEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const monkeyRef = useRef<HTMLSpanElement>(null);
  const reset = useRef<number | undefined>(undefined);
  const [monkey, setMonkey] = useState(REST_MONKEY);
  const [toss, setToss] = useState<Toss | null>(null);
  const [clearing, setClearing] = useState(false);

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
        setClearing(false);
        setMonkey("🐵");

        const input = emailField();
        if (input && monkeyRef.current) {
          const monkeyBox = pageBox(monkeyRef.current);
          const bananas = planBananas(pageBox(input));
          setToss({
            from: { x: monkeyBox.left + monkeyBox.width / 2, y: monkeyBox.top },
            bananas,
          });
          // One pulse per throw, driven by the browser instead of a timer each.
          if (!reduceMotion) {
            monkeyRef.current.animate([{ scale: 1 }, { scale: 1.3 }, { scale: 1 }], {
              duration: STAGGER_MS,
              iterations: bananas.length,
              easing: "ease-out",
            });
          }

          await wait(reduceMotion ? 0 : THROW_MS);
          glow(input);
          await wait(reduceMotion ? 400 : (bananas.length - 1) * STAGGER_MS);
          await wait(HOLD_MS);
          setClearing(true);
          await wait(CLEAR_MS + bananas.length * CLEAR_STAGGER_MS);
          setToss(null);
          setClearing(false);
        }

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
          {/* Each banana flies from the monkey to its own slot, then fades away. */}
          {toss.bananas.map((banana, index) => (
            <motion.span
              key={`${banana.x}-${banana.y}`}
              aria-hidden="true"
              className="absolute text-2xl leading-none"
              style={{ left: banana.x, top: banana.y }}
              initial={
                reduceMotion
                  ? { opacity: 0, rotate: banana.rotate }
                  : {
                      x: toss.from.x - banana.x,
                      y: toss.from.y - banana.y,
                      rotate: 10,
                      opacity: 0,
                    }
              }
              animate={
                clearing
                  ? {
                      x: 0,
                      y: -8,
                      rotate: banana.rotate,
                      scale: 0.7,
                      opacity: 0,
                    }
                  : {
                      x: 0,
                      y: 0,
                      rotate: banana.rotate,
                      scale: 1,
                      opacity: reduceMotion ? 1 : [0, 1, 1],
                    }
              }
              transition={
                clearing
                  ? {
                      duration: CLEAR_MS / 1000,
                      delay: (index * CLEAR_STAGGER_MS) / 1000,
                      ease: "easeOut",
                    }
                  : reduceMotion
                    ? { duration: 0.3, delay: banana.delay }
                    : {
                        duration: THROW_MS / 1000,
                        delay: banana.delay,
                        ease: [0.3, 0.7, 0.5, 1],
                        opacity: {
                          duration: THROW_MS / 1000,
                          delay: banana.delay,
                          times: [0, 0.06, 1],
                          ease: "linear",
                        },
                      }
              }
            >
              🍌
            </motion.span>
          ))}
        </PageLayer>
      )}
    </>
  );
};

export default MonkeyEgg;

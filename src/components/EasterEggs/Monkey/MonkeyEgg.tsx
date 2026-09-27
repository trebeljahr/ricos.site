import { Sprite } from "@components/Sprite";
import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import type { EmojiSprite } from "src/lib/sprites";
import { EmojiButton } from "../EmojiButton";
import { type PageBox, PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

// See no evil, hear no evil, speak no evil: one per click.
const WISE_MONKEYS: EmojiSprite[] = ["🙈", "🙉", "🙊"];
const REST_MONKEY: EmojiSprite = "🙊";
const THROW_MS = 520;
const SETTLE_MS = 220;
const HOLD_MS = 700;
const CLEAR_MS = 800;
const CLEAR_STAGGER_MS = 40;
const RESET_MS = 2400;
/** Idle wink: the monkey flicks through its faces to be noticed. */
const PEEK_MIN_MS = 15000;
const PEEK_MAX_MS = 40000;
const PEEK_FRAME_MS = 130;

/** A banana glyph is ~24px wide and tall, so slots of this size never overlap. */
const SLOT_W = 32;
const FIRST_X = 6;
const FIRST_Y = -14;

type Banana = {
  id: number;
  col: number;
  drift: number;
  rotate: number;
  from: { x: number; y: number };
};

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
 * The spots the bananas come to rest on: one row along the top edge of the
 * field, a glyph apart so no two bananas ever land on each other. The first one
 * takes the top left corner, the rest come in random order across the width.
 */
function planSlots(field: PageBox): number[] {
  const cols = Math.max(1, Math.floor((field.width - FIRST_X) / SLOT_W));
  const rest = Array.from({ length: cols - 1 }, (_, i) => i + 1);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [0, ...rest];
}

const spotOf = (field: PageBox, banana: Banana) => ({
  x: field.left + FIRST_X + banana.col * SLOT_W + banana.drift,
  y: field.top + FIRST_Y,
});

/**
 * Easter egg on the newsletter form: the monkey cycles through the three wise
 * monkeys while you click, and throws one banana each time you click all the
 * way through them. The bananas stay lying on the top edge of the field until
 * the row is full, then the whole row fades away and it starts over.
 */
const MonkeyEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const monkeyRef = useRef<HTMLSpanElement>(null);
  const reset = useRef<number | undefined>(undefined);
  const pool = useRef<number[]>([]);
  const rowLength = useRef(0);
  const nextId = useRef(0);
  const lastClick = useRef(0);
  const [monkey, setMonkey] = useState<EmojiSprite>(REST_MONKEY);
  const [field, setField] = useState<PageBox | null>(null);
  const [bananas, setBananas] = useState<Banana[]>([]);
  const [clearing, setClearing] = useState(false);

  useEffect(() => () => window.clearTimeout(reset.current), []);

  // Every now and then the monkey flicks through its three faces, so the egg
  // has a chance of being noticed. Never while it is throwing, while someone is
  // clicking it, or in a background tab.
  useEffect(() => {
    if (reduceMotion) return;
    let timer: number | undefined;
    let flick: number | undefined;

    const schedule = () =>
      (timer = window.setTimeout(peek, PEEK_MIN_MS + Math.random() * (PEEK_MAX_MS - PEEK_MIN_MS)));

    const peek = () => {
      if (busyRef.current || document.hidden || Date.now() - lastClick.current < RESET_MS) {
        schedule();
        return;
      }
      let frame = 0;
      flick = window.setInterval(() => {
        frame += 1;
        if (frame > WISE_MONKEYS.length) {
          window.clearInterval(flick);
          setMonkey(REST_MONKEY);
          schedule();
          return;
        }
        setMonkey(WISE_MONKEYS[frame - 1]);
      }, PEEK_FRAME_MS);
    };

    schedule();
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(flick);
    };
  }, [busyRef, reduceMotion]);

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
          const box = pageBox(input);
          // A fresh pile starts over at the corner; a resized field moves the
          // ones already lying there along with it.
          if (!pool.current.length) {
            pool.current = planSlots(box);
            rowLength.current = pool.current.length;
          }
          const col = pool.current.shift();
          const monkeyBox = pageBox(monkeyRef.current);

          if (col !== undefined) {
            const thrown: Banana = {
              id: nextId.current++,
              col,
              drift: col === 0 ? 0 : (Math.random() * 2 - 1) * 3,
              rotate: col === 0 ? -24 : -35 + Math.random() * 60,
              from: { x: monkeyBox.left + monkeyBox.width / 2, y: monkeyBox.top },
            };
            setField(box);
            setBananas((pile) => [...pile, thrown]);
            await wait(reduceMotion ? 0 : THROW_MS);
            glow(input);

            // The row is full, so the next throw would have to stack: sweep first.
            if (!pool.current.length) {
              await wait(HOLD_MS);
              setClearing(true);
              await wait(CLEAR_MS + rowLength.current * CLEAR_STAGGER_MS);
              setBananas([]);
              setClearing(false);
            }
          }
        }

        await wait(SETTLE_MS);
        setMonkey(REST_MONKEY);
      }),
  });

  return (
    <>
      <EmojiButton
        label="Monkey"
        nudge={false}
        onClick={() => {
          lastClick.current = Date.now();
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={monkeyRef} className="inline-block">
          <Sprite name={monkey} />
        </span>
      </EmojiButton>
      {field && bananas.length > 0 && (
        <PageLayer>
          {/* Thrown straight at the field, then left lying there at an angle. */}
          {bananas.map((banana, index) => {
            const spot = spotOf(field, banana);
            return (
              <motion.span
                key={banana.id}
                aria-hidden="true"
                className="absolute text-2xl leading-none"
                style={{ left: spot.x, top: spot.y }}
                initial={
                  reduceMotion
                    ? { opacity: 0, rotate: banana.rotate }
                    : {
                        x: banana.from.x - spot.x,
                        y: banana.from.y - spot.y,
                        rotate: 10,
                        opacity: 1,
                      }
                }
                animate={
                  clearing
                    ? { x: 0, y: -8, rotate: banana.rotate, scale: 0.7, opacity: 0 }
                    : { x: 0, y: 0, rotate: banana.rotate, scale: 1, opacity: 1 }
                }
                transition={
                  clearing
                    ? {
                        duration: CLEAR_MS / 1000,
                        delay: (index * CLEAR_STAGGER_MS) / 1000,
                        ease: "easeOut",
                      }
                    : reduceMotion
                      ? { duration: 0.3 }
                      : { duration: THROW_MS / 1000, ease: [0.3, 0.7, 0.5, 1] }
                }
              >
                <Sprite name="🍌" />
              </motion.span>
            );
          })}
        </PageLayer>
      )}
    </>
  );
};

export default MonkeyEgg;

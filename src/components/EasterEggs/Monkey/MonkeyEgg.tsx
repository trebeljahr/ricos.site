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
const SETTLE_MS = 220;
const HOLD_MS = 700;
const CLEAR_MS = 800;
const CLEAR_STAGGER_MS = 40;
const RESET_MS = 2400;

/** Throws it takes to fill the field's edge; the pile fades once it is reached. */
const BANANAS = 20;
/** A banana glyph is ~24px wide and tall, so slots of this size never overlap. */
const SLOT_W = 32;
const ROW_H = 28;
const FIRST_X = 6;
const FIRST_Y = -14;

type Slot = { row: number; col: number };
type Banana = {
  id: number;
  slot: Slot;
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
 * The spots the bananas come to rest on: a row along the top edge of the field,
 * filled from the corner rightwards, stacking upwards onto the box once the row
 * is full. Slots are a glyph apart, so no two bananas ever land on each other.
 */
function planSlots(field: PageBox): Slot[] {
  const cols = Math.max(1, Math.floor((field.width - FIRST_X) / SLOT_W));
  const rows = Math.ceil(BANANAS / cols);
  const slots: Slot[] = [];

  for (let row = 0; row < rows; row++) {
    const inRow: Slot[] = [];
    for (let col = 0; col < cols; col++) inRow.push({ row, col });
    // Shuffled per row, so the throws scatter across the width but still fill
    // the row nearest the field before piling up above it.
    for (let i = inRow.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [inRow[i], inRow[j]] = [inRow[j], inRow[i]];
    }
    slots.push(...inRow);
  }

  // The very first banana keeps the top left corner it always had.
  const corner = slots.findIndex(({ row, col }) => row === 0 && col === 0);
  slots.unshift(...slots.splice(corner, 1));
  return slots.slice(0, BANANAS);
}

const spotOf = (field: PageBox, banana: Banana) => ({
  x: field.left + FIRST_X + banana.slot.col * SLOT_W + banana.drift,
  y: field.top + FIRST_Y - banana.slot.row * ROW_H,
});

/**
 * Easter egg on the newsletter form: the monkey cycles through the three wise
 * monkeys while you click, and throws one banana each time you click all the
 * way through them. The bananas stay lying on the field until the twentieth
 * one lands, then the whole pile fades away.
 */
const MonkeyEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const monkeyRef = useRef<HTMLSpanElement>(null);
  const reset = useRef<number | undefined>(undefined);
  const pool = useRef<Slot[]>([]);
  const nextId = useRef(0);
  const [monkey, setMonkey] = useState(REST_MONKEY);
  const [field, setField] = useState<PageBox | null>(null);
  const [bananas, setBananas] = useState<Banana[]>([]);
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
          if (!pool.current.length) pool.current = planSlots(box);
          const slot = pool.current.shift();
          const monkeyBox = pageBox(monkeyRef.current);

          if (slot) {
            const thrown: Banana = {
              id: nextId.current++,
              slot,
              drift: slot.row === 0 && slot.col === 0 ? 0 : (Math.random() * 2 - 1) * 3,
              rotate: slot.row === 0 && slot.col === 0 ? -24 : -35 + Math.random() * 60,
              from: { x: monkeyBox.left + monkeyBox.width / 2, y: monkeyBox.top },
            };
            setField(box);
            setBananas((pile) => [...pile, thrown]);
            await wait(reduceMotion ? 0 : THROW_MS);
            glow(input);

            if (!pool.current.length) {
              await wait(HOLD_MS);
              setClearing(true);
              await wait(CLEAR_MS + BANANAS * CLEAR_STAGGER_MS);
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
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={monkeyRef} className="inline-block">
          {monkey}
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
                🍌
              </motion.span>
            );
          })}
        </PageLayer>
      )}
    </>
  );
};

export default MonkeyEgg;

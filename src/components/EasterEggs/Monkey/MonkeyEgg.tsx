import { useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

const WISE_MONKEYS = ["🙈", "🙉", "🙊"];
const FRAME_MS = 220;
const TOSS_MS = 900;
const PAD = 30;

type Toss = { left: number; top: number; width: number; height: number; d: string };

/** An arc from the monkey to the left end of the email field. */
function planToss(monkey: Element, input: Element): Toss {
  const m = pageBox(monkey);
  const i = pageBox(input);
  const x0 = m.left + m.width / 2;
  const y0 = m.top + m.height / 2;
  const x1 = i.left + Math.min(48, i.width / 3);
  const y1 = i.top + i.height / 2;
  const peak = Math.min(y0, y1) - 70;
  const left = Math.min(x0, x1) - PAD;
  const top = peak - PAD;
  const width = Math.abs(x1 - x0) + PAD * 2;
  const height = Math.max(y0, y1) - peak + PAD * 2;
  const p = (x: number, y: number) => `${Math.round(x - left)} ${Math.round(y - top)}`;
  return {
    left,
    top,
    width,
    height,
    d: `M ${p(x0, y0)} Q ${p((x0 + x1) / 2, peak - 40)} ${p(x1, y1)}`,
  };
}

const glow = (input: Element) =>
  input.animate(
    [
      { boxShadow: "0 0 0 0 rgba(45, 212, 191, 0)" },
      { boxShadow: "0 0 0 4px rgba(45, 212, 191, 0.7)" },
      { boxShadow: "0 0 0 0 rgba(45, 212, 191, 0)" },
    ],
    { duration: 700, iterations: 2 },
  );

const MonkeyEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const monkeyRef = useRef<HTMLSpanElement>(null);
  const bananaRef = useRef<HTMLSpanElement>(null);
  const [monkey, setMonkey] = useState("🙊");
  const [toss, setToss] = useState<Toss | null>(null);

  const registerClick = useEasterEgg("monkey", {
    onTrigger: () =>
      run(async () => {
        const input = monkeyRef.current
          ?.closest("h2")
          ?.parentElement?.querySelector('input[type="email"]');

        if (reduceMotion) {
          setMonkey("🐵");
          if (input) glow(input);
          await wait(1600);
          setMonkey("🙊");
          return;
        }

        // See no evil, hear no evil, speak no evil, twice.
        for (let i = 0; i < WISE_MONKEYS.length * 2; i++) {
          setMonkey(WISE_MONKEYS[i % WISE_MONKEYS.length]);
          await wait(FRAME_MS);
        }
        setMonkey("🐵");
        monkeyRef.current?.animate([{ scale: 1 }, { scale: 1.35 }, { scale: 1 }], {
          duration: 320,
          easing: "ease-out",
        });

        if (input && monkeyRef.current) {
          setToss(planToss(monkeyRef.current, input));
          await wait(30);
          const banana = bananaRef.current;
          if (banana) {
            banana.animate([{ rotate: "0deg" }, { rotate: "720deg" }], { duration: TOSS_MS });
            await banana
              .animate([{ offsetDistance: "0%" }, { offsetDistance: "100%" }], {
                duration: TOSS_MS,
                easing: "cubic-bezier(0.3, 0, 0.7, 1)",
                fill: "forwards",
              })
              .finished.catch(() => undefined);
          }
          glow(input);
          await bananaRef.current
            ?.animate(
              [
                { opacity: 1, scale: 1 },
                { opacity: 0, scale: 0.6 },
              ],
              {
                duration: 600,
                delay: 500,
                fill: "forwards",
              },
            )
            .finished.catch(() => undefined);
          setToss(null);
        } else {
          await wait(1000);
        }
        await wait(300);
        setMonkey("🙊");
      }),
  });

  return (
    <>
      <EmojiButton
        label="Monkey"
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
          <div
            aria-hidden="true"
            className="absolute text-base font-normal"
            style={{ left: toss.left, top: toss.top, width: toss.width, height: toss.height }}
          >
            <span
              ref={bananaRef}
              className="absolute top-0 left-0 inline-block text-2xl leading-none"
              style={{
                offsetPath: `path("${toss.d}")`,
                offsetRotate: "0deg",
                offsetDistance: "0%",
              }}
            >
              🍌
            </span>
          </div>
        </PageLayer>
      )}
    </>
  );
};

export default MonkeyEgg;

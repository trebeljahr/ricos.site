import { useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { useEggRunner } from "../useEggRunner";

const FACES = ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"];
const RESTING_FACE = "🕓";
const SPIN_MS = 1600;

type Props = {
  readingTime: number;
  /** Renders the minutes, so the parent keeps its own markup. */
  onMinutes: (minutes: number) => void;
};

/**
 * Easter egg on a post's reading time: time flies. The clock spins through
 * the hours while the minutes count down to zero, the alarm rings, and the
 * minutes count back up.
 */
const ClockEgg = ({ readingTime, onMinutes }: Props) => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const faceRef = useRef<HTMLSpanElement>(null);
  const [face, setFace] = useState(RESTING_FACE);

  // Counts from `from` to `to` over `ms`, easing in so it speeds up like a spinning clock.
  const count = (from: number, to: number, ms: number, withFaces: boolean) =>
    new Promise<void>((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        const eased = t * t;
        onMinutes(Math.round(from + (to - from) * eased));
        if (withFaces) setFace(FACES[Math.floor(eased * FACES.length * 2) % FACES.length]);
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });

  const registerClick = useEasterEgg("clock", {
    onTrigger: () =>
      run(async () => {
        if (reduceMotion) {
          setFace("⏰");
          await wait(1500);
          setFace(RESTING_FACE);
          return;
        }
        await count(readingTime, 0, SPIN_MS, true);
        setFace("⏰");
        await faceRef.current?.animate(
          [
            { rotate: "0deg" },
            { rotate: "-18deg" },
            { rotate: "18deg" },
            { rotate: "-18deg" },
            { rotate: "18deg" },
            { rotate: "-12deg" },
            { rotate: "12deg" },
            { rotate: "0deg" },
          ],
          { duration: 800, easing: "linear" },
        ).finished;
        await wait(200);
        setFace(RESTING_FACE);
        await count(0, readingTime, 700, false);
        onMinutes(readingTime);
      }),
  });

  return (
    <>
      <EmojiButton
        label="Clock"
        hint={false}
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={faceRef} className="inline-block">
          {face}
        </span>
      </EmojiButton>{" "}
    </>
  );
};

export default ClockEgg;

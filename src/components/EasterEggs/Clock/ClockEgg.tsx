import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { useEggRunner } from "../useEggRunner";

const FACES = ["🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛"];
const RESTING_FACE = "🕓";
const RESTING_INDEX = FACES.indexOf(RESTING_FACE);
const MIDNIGHT_INDEX = FACES.length - 1;

/** A full turn on top of the stretch up to midnight, so the hand lands on 🕛. */
const spinSteps = (from: number) =>
  FACES.length + ((MIDNIGHT_INDEX - from + FACES.length) % FACES.length);
const FIRST_STEP_MS = 120;
const LAST_STEP_MS = 24;
const ALARM_MS = 800;
/** Clicks stop showing after this, so a half-wound clock does not stay wound. */
const REWIND_MS = 2400;

/**
 * Easter egg on a post's reading time: time flies. Every click ticks the clock
 * one hour forward, and the fifth spins it around the dial into an alarm. The
 * minutes next to it never move — only the hands do.
 */
const ClockEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const faceRef = useRef<HTMLSpanElement>(null);
  const rewind = useRef<number | undefined>(undefined);
  /** The hour the hand stands on, so a spin carries on from the clicks. */
  const hour = useRef(RESTING_INDEX);
  const [face, setFace] = useState(RESTING_FACE);

  const showHour = (index: number) => {
    hour.current = ((index % FACES.length) + FACES.length) % FACES.length;
    setFace(FACES[hour.current]);
  };

  useEffect(() => () => window.clearTimeout(rewind.current), []);

  const registerClick = useEasterEgg("clock", {
    onProgress: (clicks) => {
      showHour(RESTING_INDEX + clicks);
      window.clearTimeout(rewind.current);
      rewind.current = window.setTimeout(() => showHour(RESTING_INDEX), REWIND_MS);
    },
    onTrigger: () =>
      run(async () => {
        window.clearTimeout(rewind.current);
        if (reduceMotion) {
          setFace("⏰");
          await wait(1500);
          showHour(RESTING_INDEX);
          return;
        }

        // Each tick is a discrete hour, and the gaps shorten, so the hand runs
        // away from you instead of sliding smoothly.
        const start = hour.current;
        const steps = spinSteps(start);
        for (let step = 1; step <= steps; step++) {
          const t = step / steps;
          showHour(start + step);
          await wait(FIRST_STEP_MS + (LAST_STEP_MS - FIRST_STEP_MS) * t * t);
        }

        setFace("⏰");
        // Not awaiting the animation: in a hidden tab it never finishes, and the
        // clock would stay an alarm clock for good.
        faceRef.current?.animate(
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
          { duration: ALARM_MS, easing: "linear" },
        );
        await wait(ALARM_MS + 300);
        showHour(RESTING_INDEX);
      }),
  });

  return (
    <EmojiButton
      label="Clock"
      nudge={false}
      onClick={() => {
        if (!busyRef.current) registerClick();
      }}
    >
      <span ref={faceRef} className="inline-block">
        {face}
      </span>
    </EmojiButton>
  );
};

export default ClockEgg;

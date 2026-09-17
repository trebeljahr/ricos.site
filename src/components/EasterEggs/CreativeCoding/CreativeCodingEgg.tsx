import clsx from "clsx";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { useEggRunner } from "../useEggRunner";

const CYCLE_MS = 4000;
const START_HUE = 255; // Close to the site blue, so the cycle starts and ends near it.
const STILL_HUE = 330;
const STILL_MS = 2500;
// Every accent-coloured link, card border and hover glow reads these two variables.
const VARIABLES = ["--color-accent", "--color-myBlue"] as const;

function paint(root: HTMLElement, hue: number) {
  const dark = root.classList.contains("dark");
  root.style.setProperty("--color-accent", `oklch(${dark ? 0.78 : 0.58} 0.15 ${hue})`);
  root.style.setProperty("--color-myBlue", `oklch(0.7 0.15 ${hue})`);
}

/** Snapshots the inline values of the variables, and returns a function that puts them back. */
function snapshot(root: HTMLElement) {
  const saved = VARIABLES.map((name) => ({
    name,
    value: root.style.getPropertyValue(name),
    priority: root.style.getPropertyPriority(name),
  }));
  return () => {
    for (const { name, value, priority } of saved) {
      if (value) root.style.setProperty(name, value, priority);
      else root.style.removeProperty(name);
    }
  };
}

const CreativeCodingEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef, busy } = useEggRunner();
  const restore = useRef<(() => void) | null>(null);
  const frame = useRef(0);
  const [hue, setHue] = useState(0);

  // Leaving the page mid-cycle must still put the colours back.
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      restore.current?.();
    },
    [],
  );

  const registerClick = useEasterEgg("creative-coding", {
    onTrigger: () =>
      run(async () => {
        const root = document.documentElement;
        restore.current = snapshot(root);
        try {
          if (reduceMotion) {
            paint(root, STILL_HUE);
            setHue(STILL_HUE - START_HUE);
            await wait(STILL_MS);
            return;
          }
          await new Promise<void>((resolve) => {
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min(1, (now - start) / CYCLE_MS);
              const turn = 360 * (0.5 - Math.cos(progress * Math.PI) / 2);
              paint(root, START_HUE + turn);
              setHue(turn);
              if (progress < 1) frame.current = requestAnimationFrame(tick);
              else resolve();
            };
            frame.current = requestAnimationFrame(tick);
          });
        } finally {
          restore.current?.();
          restore.current = null;
          setHue(0);
        }
      }),
  });

  return (
    <>
      {/* No colour transition here: the variable changes every frame, so a transition would restart and never move. */}
      <span className={clsx(busy && "text-accent")}>Creative Coding</span>{" "}
      <EmojiButton
        label="Palette"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span
          className="inline-block"
          style={hue ? { filter: `hue-rotate(${hue}deg)` } : undefined}
        >
          🎨
        </span>
      </EmojiButton>
    </>
  );
};

export default CreativeCodingEgg;

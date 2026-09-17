import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
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

const WAVE = 8; // Half a wavelength, in pixels.
const SQUIGGLE_HEIGHT = 10;

/**
 * A hand-drawn looking wave exactly `width` pixels long. Built in real pixels
 * rather than stretched from a fixed viewBox, so the stroke keeps its shape
 * and the draw-on animation covers the whole word.
 */
function squigglePath(width: number) {
  const mid = SQUIGGLE_HEIGHT / 2;
  let d = `M 2 ${mid} Q ${2 + WAVE / 2} ${mid - 4} ${2 + WAVE} ${mid}`;
  for (let x = 2 + WAVE * 2; x <= width - 2; x += WAVE) d += ` T ${x} ${mid}`;
  return d;
}

const WritingEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const [typed, setTyped] = useState<string | null>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  // Width of the drawn squiggle; null until the egg is found. It stays after that.
  const [squiggle, setSquiggle] = useState<number | null>(null);

  // Headings change size across breakpoints: keep the squiggle as wide as the word.
  useEffect(() => {
    if (squiggle === null) return;
    const fit = () => wordRef.current && setSquiggle(wordRef.current.offsetWidth);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [squiggle]);

  const registerClick = useEasterEgg("writing", {
    onTrigger: () =>
      run(async () => {
        setSquiggle(null);
        if (!reduceMotion) {
          for (const { text, delay } of KEYSTROKES) {
            await wait(delay);
            setTyped(text);
          }
          await wait(250);
          setTyped(null);
        }
        setSquiggle(wordRef.current?.offsetWidth ?? null);
        await wait(30);
        if (!reduceMotion) {
          await pathRef.current
            ?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
              duration: 700,
              easing: "ease-in-out",
              fill: "forwards",
            })
            .finished.catch(() => undefined);
        }
      }),
  });

  return (
    <>
      <span className="relative inline-block">
        {/* The real word stays in place (transparent while typing) so width and heading name never change. */}
        <span ref={wordRef} className={typed === null ? undefined : "text-transparent"}>
          {WORD}
        </span>
        {typed !== null && (
          <span aria-hidden="true" className="absolute top-0 left-0 whitespace-nowrap">
            {typed}
            <span className="ml-0.5 inline-block h-[0.85em] w-[0.06em] translate-y-[0.08em] bg-current" />
          </span>
        )}
        {squiggle !== null && (
          <svg
            aria-hidden="true"
            width={squiggle}
            height={SQUIGGLE_HEIGHT}
            viewBox={`0 0 ${squiggle} ${SQUIGGLE_HEIGHT}`}
            className="text-accent pointer-events-none absolute top-[88%] left-0 overflow-visible"
          >
            <path
              ref={pathRef}
              d={squigglePath(squiggle)}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              // Hidden until the draw-on animation runs; drawn at once with reduced motion.
              strokeDasharray="1 2"
              strokeDashoffset={reduceMotion ? 0 : 1}
            />
          </svg>
        )}
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

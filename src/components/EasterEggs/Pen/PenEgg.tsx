import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { useEggRunner } from "../useEggRunner";

const CLICKS = 5;
const STROKE_HEIGHT = 14;
/** An unfinished underline does not stay behind after the clicking stops. */
const REWIND_MS = 2600;
const HOLD_MS = 2000;
const FADE_MS = 500;

/** A hand-drawn underline: down the line and slightly wavy, like a quick pen stroke. */
const underlinePath = (width: number) =>
  `M 2 6 Q ${width * 0.3} 3 ${width * 0.6} 6 T ${width - 2} 5`;

/** The stroke back, a touch lower, the way a second pass under a word looks. */
const flourishPath = (width: number) =>
  `M ${width - 4} 11 Q ${width * 0.6} 13 ${width * 0.3} 10 T 4 11.5`;

type Props = {
  /** The rest of the date line, which the pen underlines. */
  children: ReactNode;
};

/**
 * Easter egg on a post's date: the pen signs it. Each click draws a bit more of
 * an underline and walks the pen along it, and the fifth stroke runs back under
 * the date before the ink fades.
 */
const PenEgg = ({ children }: Props) => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const lineRef = useRef<HTMLSpanElement>(null);
  const rewind = useRef<number | undefined>(undefined);
  const [width, setWidth] = useState(0);
  /** How much of the underline is drawn, 0 to 1. */
  const [drawn, setDrawn] = useState(0);
  const [flourish, setFlourish] = useState(false);
  const [inked, setInked] = useState(true);

  useEffect(() => () => window.clearTimeout(rewind.current), []);

  // The date line rewraps across breakpoints, so the stroke is re-measured while it shows.
  useEffect(() => {
    if (!width) return;
    const fit = () => lineRef.current && setWidth(lineRef.current.offsetWidth);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [width]);

  const erase = () => {
    setInked(false);
    rewind.current = window.setTimeout(() => {
      setDrawn(0);
      setFlourish(false);
      setInked(true);
    }, FADE_MS);
  };

  const registerClick = useEasterEgg("pen", {
    onProgress: (clicks) => {
      window.clearTimeout(rewind.current);
      setWidth(lineRef.current?.offsetWidth ?? 0);
      setInked(true);
      setDrawn(clicks / CLICKS);
      rewind.current = window.setTimeout(erase, REWIND_MS);
    },
    onTrigger: () =>
      run(async () => {
        window.clearTimeout(rewind.current);
        setWidth(lineRef.current?.offsetWidth ?? 0);
        setInked(true);
        setDrawn(1);
        await wait(reduceMotion ? 0 : 420);
        setFlourish(true);
        await wait(reduceMotion ? 300 : 520);
        await wait(HOLD_MS);
        erase();
        await wait(FADE_MS + 200);
      }),
  });

  // The pen rides along with the ink, and waits at the end for the stroke back.
  const penX = width ? (flourish ? 0 : width * Math.min(1, drawn) - 4) : 0;

  return (
    <>
      <EmojiButton
        label="Pencil"
        nudge={false}
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <motion.span
          className="inline-block"
          animate={reduceMotion ? {} : { x: penX, y: drawn ? 5 : 0, rotate: drawn ? -14 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          ✏️
        </motion.span>
      </EmojiButton>{" "}
      <span ref={lineRef} className="relative inline-block">
        {children}
        {width > 0 && (
          <motion.svg
            aria-hidden="true"
            width={width}
            height={STROKE_HEIGHT}
            viewBox={`0 0 ${width} ${STROKE_HEIGHT}`}
            className="text-accent pointer-events-none absolute top-[92%] left-0 overflow-visible"
            animate={{ opacity: inked ? 1 : 0 }}
            transition={{ duration: FADE_MS / 1000 }}
          >
            <motion.path
              d={underlinePath(width)}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: drawn }}
              transition={{ duration: reduceMotion ? 0 : 0.4, ease: "easeOut" }}
            />
            <motion.path
              d={flourishPath(width)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: flourish ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.5, ease: "easeInOut" }}
            />
          </motion.svg>
        )}
      </span>
    </>
  );
};

export default PenEgg;

import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { useEggRunner } from "../useEggRunner";

const CLICKS = 3;
const STROKE_HEIGHT = 14;
const LIFT_MS = 220;
const DRAW_MS = 800;
const BACK_MS = 520;
const ERASE_MS = 760;

/** How far the pencil leans over while it writes. */
const TILT_DEG = -14;
/**
 * The two corners of the emoji, as fractions of its box. The pencil is drawn
 * corner to corner: the point sits in the bottom left, the eraser in the top
 * right. Measured off a canvas, not guessed.
 */
const TIP = { x: 0, y: 0.83 };
const ERASER = { x: 0.77, y: 0.14 };
/** Turned over, so the pink end is the one on the paper. */
const ERASE_TILT_DEG = TILT_DEG + 180;

/** The underline sits this far down the date line; the strokes run at these heights in it. */
const STROKE_TOP = 0.92;
const INK_Y = 5.5;
const FLOURISH_Y = 11;
/** The eraser works between the two strokes, so it covers both. */
const ERASE_Y = 8.5;

/** A hand-drawn underline: down the line and slightly wavy, like a quick pen stroke. */
const underlinePath = (width: number) =>
  `M 2 6 Q ${width * 0.3} 3 ${width * 0.6} 6 T ${width - 2} 5`;

/** The stroke back, a touch lower, the way a second pass under a word looks. */
const flourishPath = (width: number) =>
  `M ${width - 4} 11 Q ${width * 0.6} 13 ${width * 0.3} 10 T 4 11.5`;

/**
 * rest: the pencil sits in the text. lift: it drops to the start of the line.
 * draw: out along the underline. back: the second stroke. signed: the ink stays.
 * raise: the pencil turns over at the far end. erase: it rubs the ink out.
 */
type Phase = "rest" | "lift" | "draw" | "back" | "signed" | "raise" | "erase";

type Offset = { x: number; y: number };

/**
 * Where a corner of the tilted emoji lands, relative to the emoji's own box.
 * It rotates about its middle, so the corner turns with it.
 */
function cornerOffset(box: DOMRect, corner: Offset, tiltDeg: number): Offset {
  const rad = (tiltDeg * Math.PI) / 180;
  const x = (corner.x - 0.5) * box.width;
  const y = (corner.y - 0.5) * box.height;
  return {
    x: box.width / 2 + (x * Math.cos(rad) - y * Math.sin(rad)),
    y: box.height / 2 + (x * Math.sin(rad) + y * Math.cos(rad)),
  };
}

type Props = {
  /** The rest of the date line, which the pen underlines. */
  children: ReactNode;
};

/**
 * Easter egg on a post's date: the pen signs it. A few clicks wiggle the
 * pencil, then it runs the whole underline in one stroke and comes back under
 * the date a second time. The signature stays; one more click turns the pencil
 * over and rubs it out.
 */
const PenEgg = ({ children }: Props) => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const lineRef = useRef<HTMLSpanElement>(null);
  const penRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  /** Moves the pencil from where it rests to the start of the ink, point down. */
  const [start, setStart] = useState<Offset>({ x: 0, y: 0 });
  /** The same, for the eraser end at the near end of the ink. */
  const [rub, setRub] = useState<Offset>({ x: 0, y: 0 });
  const [phase, setPhase] = useState<Phase>("rest");

  /**
   * Lines up the ends of the pencil with the ink. Only valid while the pencil
   * rests: its box is measured before it is moved.
   */
  const measure = () => {
    const line = lineRef.current;
    const pen = penRef.current;
    if (!line || !pen) return;
    const lineBox = line.getBoundingClientRect();
    const penBox = pen.getBoundingClientRect();
    const inkTop = lineBox.top + lineBox.height * STROKE_TOP;
    const tip = cornerOffset(penBox, TIP, TILT_DEG);
    const eraser = cornerOffset(penBox, ERASER, ERASE_TILT_DEG);
    setWidth(line.offsetWidth);
    setStart({
      x: lineBox.left + 2 - (penBox.left + tip.x),
      y: inkTop + INK_Y - (penBox.top + tip.y),
    });
    setRub({
      x: lineBox.left + 2 - (penBox.left + eraser.x),
      y: inkTop + ERASE_Y - (penBox.top + eraser.y),
    });
  };

  // The date line rewraps across breakpoints, so the stroke is measured again
  // once the pencil is back in the text and the boxes mean something.
  useEffect(() => {
    if (!width || (phase !== "rest" && phase !== "signed")) return;
    const fit = () => measure();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  });

  const sign = () =>
    run(async () => {
      measure();
      // The pencil is set down at the start of the line first, so it does not
      // have to catch up with its own ink.
      setPhase("lift");
      await wait(reduceMotion ? 0 : LIFT_MS);
      setPhase("draw");
      await wait(reduceMotion ? 0 : DRAW_MS);
      setPhase("back");
      await wait(reduceMotion ? 300 : BACK_MS);
      setPhase("signed");
    });

  const erase = () =>
    run(async () => {
      setPhase("raise");
      await wait(reduceMotion ? 0 : LIFT_MS);
      setPhase("erase");
      await wait(reduceMotion ? 300 : ERASE_MS);
      setPhase("rest");
    });

  const registerClick = useEasterEgg("pen", { clicks: CLICKS, onTrigger: sign });

  const writing = phase === "lift" || phase === "draw" || phase === "back";
  const rubbing = phase === "raise" || phase === "erase";
  // The pen rides out with the ink, comes back with the second stroke, and the
  // eraser starts at the far end of the line and sweeps back.
  const penX = writing
    ? start.x + (phase === "draw" ? width - 4 : 0)
    : rubbing
      ? rub.x + (phase === "raise" ? width - 4 : 0)
      : 0;
  const penY = writing
    ? start.y + (phase === "back" ? FLOURISH_Y - INK_Y : 0)
    : rubbing
      ? rub.y
      : 0;
  const penMs =
    phase === "draw"
      ? DRAW_MS
      : phase === "back"
        ? BACK_MS
        : phase === "erase"
          ? ERASE_MS
          : LIFT_MS;
  const penTilt = writing ? TILT_DEG : rubbing ? ERASE_TILT_DEG : 0;

  const underline = phase !== "rest" && phase !== "lift";
  const flourish = underline && phase !== "draw";
  // The eraser takes the ink with it as it goes.
  const rubbedOut = phase === "erase";

  return (
    <>
      <EmojiButton
        label="Pencil"
        // The pencil writes over the date and its ink, never under them.
        className="z-10"
        onClick={() => {
          if (busyRef.current) return;
          if (phase === "signed") erase();
          else registerClick();
        }}
      >
        <motion.span
          ref={penRef}
          className="inline-block"
          animate={reduceMotion ? {} : { x: penX, y: penY, rotate: penTilt }}
          // Matched to the stroke it is drawing, so the tip stays on the ink. The
          // height is a separate, quicker move: the second stroke runs lower, and
          // the tip should be on it from its first millimetre.
          transition={{
            duration: penMs / 1000,
            ease: "easeInOut",
            y: { duration: (phase === "lift" || phase === "raise" ? LIFT_MS : 140) / 1000 },
          }}
        >
          ✏️
        </motion.span>
      </EmojiButton>{" "}
      <span ref={lineRef} className="relative inline-block">
        {children}
        {width > 0 && (
          <svg
            aria-hidden="true"
            width={width}
            height={STROKE_HEIGHT}
            viewBox={`0 0 ${width} ${STROKE_HEIGHT}`}
            className="text-accent pointer-events-none absolute left-0 overflow-visible"
            style={{ top: `${STROKE_TOP * 100}%` }}
          >
            {/* A round cap on an undrawn path still draws a dot at its first
                point, so a stroke is hidden until it is really being drawn. */}
            <motion.path
              d={underlinePath(width)}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: underline && !rubbedOut ? 1 : 0,
                opacity: underline ? 1 : 0,
              }}
              transition={{
                duration: reduceMotion ? 0 : (rubbedOut ? ERASE_MS : DRAW_MS) / 1000,
                ease: "easeInOut",
                opacity: { duration: 0 },
              }}
            />
            <motion.path
              d={flourishPath(width)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              // This one is drawn right to left, so shrinking it alone would rub
              // it out backwards. Sliding the dash along with it keeps the ink
              // disappearing under the eraser.
              animate={{
                pathLength: flourish && !rubbedOut ? 1 : 0,
                pathOffset: rubbedOut ? 1 : 0,
                opacity: flourish ? 1 : 0,
              }}
              transition={{
                duration: reduceMotion ? 0 : (rubbedOut ? ERASE_MS : BACK_MS) / 1000,
                ease: "easeInOut",
                opacity: { duration: 0 },
                pathOffset: {
                  duration: rubbedOut && !reduceMotion ? ERASE_MS / 1000 : 0,
                  // The same curve as the length it follows, or the two ends of
                  // the dash run apart and the stroke is rubbed out too fast.
                  ease: "easeInOut",
                },
              }}
            />
          </svg>
        )}
      </span>
    </>
  );
};

export default PenEgg;

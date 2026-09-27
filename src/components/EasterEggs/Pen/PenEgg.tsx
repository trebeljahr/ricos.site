import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { useEggRunner } from "../useEggRunner";

const CLICKS = 3;
const STROKE_HEIGHT = 14;
const DRAW_MS = 800;
const BACK_MS = 520;
const HOLD_MS = 1800;
const FADE_MS = 500;

/** How far the pencil leans over while it writes. */
const TILT_DEG = -14;
/**
 * Where the tip sits inside the emoji box, as a fraction of it. The pencil is
 * drawn corner to corner and points down to the left, so the tip is the bottom
 * left corner of the glyph — measured off a canvas, not guessed.
 */
const TIP_X = 0;
const TIP_Y = 0.83;

/** The underline sits this far down the date line; the two strokes run at these heights in it. */
const STROKE_TOP = 0.92;
const INK_Y = 5.5;
const FLOURISH_Y = 11;
/** How long the pencil takes to lift back into the line of text. */
const LIFT_MS = 300;

/** A hand-drawn underline: down the line and slightly wavy, like a quick pen stroke. */
const underlinePath = (width: number) =>
  `M 2 6 Q ${width * 0.3} 3 ${width * 0.6} 6 T ${width - 2} 5`;

/** The stroke back, a touch lower, the way a second pass under a word looks. */
const flourishPath = (width: number) =>
  `M ${width - 4} 11 Q ${width * 0.6} 13 ${width * 0.3} 10 T 4 11.5`;

/**
 * rest: the pencil sits in the text. lift: it drops to the start of the line.
 * draw: out along the underline. back: the second stroke. hold: the ink dries.
 */
type Phase = "rest" | "lift" | "draw" | "back" | "hold";

/**
 * Where the tip of the tilted pencil lands, relative to the emoji's own box.
 * The emoji rotates about its middle, so the tip turns with it.
 */
function tipOffset(box: DOMRect) {
  const rad = (TILT_DEG * Math.PI) / 180;
  const x = (TIP_X - 0.5) * box.width;
  const y = (TIP_Y - 0.5) * box.height;
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
 * pencil, then it runs the whole underline in one stroke, comes back under
 * the date a second time, and the ink fades.
 */
const PenEgg = ({ children }: Props) => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const lineRef = useRef<HTMLSpanElement>(null);
  const penRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  /** Moves the pencil from where it rests to the start of the ink. */
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [phase, setPhase] = useState<Phase>("rest");
  const [inked, setInked] = useState(true);

  /**
   * Lines up the tip of the pencil with the first point of the underline. Only
   * valid while the pencil rests: its box is measured before it is moved.
   */
  const measure = () => {
    const line = lineRef.current;
    const pen = penRef.current;
    if (!line || !pen) return;
    const lineBox = line.getBoundingClientRect();
    const penBox = pen.getBoundingClientRect();
    const tip = tipOffset(penBox);
    setWidth(line.offsetWidth);
    setStart({
      x: lineBox.left + 2 - (penBox.left + tip.x),
      y: lineBox.top + lineBox.height * STROKE_TOP + INK_Y - (penBox.top + tip.y),
    });
  };

  // The date line rewraps across breakpoints, so the stroke is measured again
  // once the pencil is back in the text and the boxes mean something.
  useEffect(() => {
    if (!width || phase !== "rest") return;
    const fit = () => measure();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  });

  const registerClick = useEasterEgg("pen", {
    clicks: CLICKS,
    onTrigger: () =>
      run(async () => {
        measure();
        setInked(true);
        // The pencil is set down at the start of the line first, so it does not
        // have to catch up with its own ink.
        setPhase("lift");
        await wait(reduceMotion ? 0 : LIFT_MS);
        setPhase("draw");
        await wait(reduceMotion ? 0 : DRAW_MS);
        setPhase("back");
        await wait(reduceMotion ? 300 : BACK_MS);
        setPhase("hold");
        await wait(HOLD_MS);

        setInked(false);
        await wait(FADE_MS);
        setPhase("rest");
        setInked(true);
      }),
  });

  // The pen rides out with the ink, comes back with the second stroke, then lifts away.
  const writing = phase === "lift" || phase === "draw" || phase === "back";
  const penX = writing ? start.x + (phase === "draw" ? width - 4 : 0) : 0;
  const penY = writing ? start.y + (phase === "back" ? FLOURISH_Y - INK_Y : 0) : 0;
  const penMs = phase === "draw" ? DRAW_MS : phase === "back" ? BACK_MS : LIFT_MS;
  const drawn = phase === "draw" || phase === "back" || phase === "hold";

  return (
    <>
      <EmojiButton
        label="Pencil"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <motion.span
          ref={penRef}
          className="inline-block"
          animate={reduceMotion ? {} : { x: penX, y: penY, rotate: writing ? TILT_DEG : 0 }}
          // Matched to the stroke it is drawing, so the tip stays on the ink. The
          // height is a separate, quicker move: the second stroke runs lower, and
          // the tip should be on it from its first millimetre.
          transition={{
            duration: penMs / 1000,
            ease: "easeInOut",
            y: { duration: (phase === "lift" ? LIFT_MS : 140) / 1000, ease: "easeOut" },
          }}
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
            className="text-accent pointer-events-none absolute left-0 overflow-visible"
            style={{ top: `${STROKE_TOP * 100}%` }}
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
              animate={{ pathLength: drawn ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : DRAW_MS / 1000, ease: "easeInOut" }}
            />
            <motion.path
              d={flourishPath(width)}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: phase === "back" || phase === "hold" ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : BACK_MS / 1000, ease: "easeInOut" }}
            />
          </motion.svg>
        )}
      </span>
    </>
  );
};

export default PenEgg;

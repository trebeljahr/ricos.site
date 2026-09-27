import { Sprite } from "@components/Sprite";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
 * The tip of the pencil, as a fraction of the emoji's box. The pencil is drawn
 * corner to corner and points down to the left, so the tip is the bottom left
 * corner of the glyph — measured off a canvas, not guessed.
 */
const TIP = { x: 0, y: 0.83 };
/** The sponge rubs with its lower middle. */
const WIPE = { x: 0.5, y: 0.78 };

/** The underline sits this far down the date line; the strokes run at these heights in it. */
const STROKE_TOP = 0.92;
const INK_Y = 5.5;
const FLOURISH_Y = 11;
/** The sponge works between the two strokes, so it covers both. */
const ERASE_Y = 8.5;

/** A hand-drawn underline: down the line and slightly wavy, like a quick pen stroke. */
const underlinePath = (width: number) =>
  `M 2 6 Q ${width * 0.3} 3 ${width * 0.6} 6 T ${width - 2} 5`;

/** The stroke back, a touch lower, the way a second pass under a word looks. */
const flourishPath = (width: number) =>
  `M ${width - 4} 11 Q ${width * 0.6} 13 ${width * 0.3} 10 T 4 11.5`;

/**
 * rest: the pencil sits in the text. lift: it drops to the start of the line.
 * draw: out along the underline. back: the second stroke. signed: the ink stays
 * and the sponge is offered. raise: the sponge moves to the far end of the ink.
 * erase: it wipes back along the line.
 */
type Phase = "rest" | "lift" | "draw" | "back" | "signed" | "raise" | "erase";

type Offset = { x: number; y: number };

/**
 * Where a point of the tilted emoji lands, relative to the emoji's own box.
 * It rotates about its middle, so the point turns with it.
 */
function contactOffset(box: DOMRect, point: Offset, tiltDeg: number): Offset {
  const rad = (tiltDeg * Math.PI) / 180;
  const x = (point.x - 0.5) * box.width;
  const y = (point.y - 0.5) * box.height;
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
 * the date a second time. The signature stays, and a sponge turns up next to
 * it to wipe it off again.
 */
const PenEgg = ({ children }: Props) => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const penButtonRef = useRef<HTMLButtonElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const penRef = useRef<HTMLSpanElement>(null);
  const spongeRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);
  /** Moves the pencil from where it rests to the start of the ink. */
  const [start, setStart] = useState<Offset>({ x: 0, y: 0 });
  /** The same for the sponge, which starts at the near end and wipes backwards. */
  const [wipe, setWipe] = useState<Offset>({ x: 0, y: 0 });
  const [phase, setPhase] = useState<Phase>("rest");

  /**
   * Lines the pencil and the sponge up with the ink. Only valid while they
   * rest: their boxes are measured before either one is moved.
   */
  const measure = () => {
    const line = lineRef.current;
    const pen = penRef.current;
    if (!line || !pen) return;
    const lineBox = line.getBoundingClientRect();
    const inkTop = lineBox.top + lineBox.height * STROKE_TOP;
    const penBox = pen.getBoundingClientRect();
    const tip = contactOffset(penBox, TIP, TILT_DEG);
    setWidth(line.offsetWidth);
    setStart({
      x: lineBox.left + 2 - (penBox.left + tip.x),
      y: inkTop + INK_Y - (penBox.top + tip.y),
    });

    const sponge = spongeRef.current;
    if (!sponge) return;
    const spongeBox = sponge.getBoundingClientRect();
    const pad = contactOffset(spongeBox, WIPE, 0);
    setWipe({
      x: lineBox.left + 2 - (spongeBox.left + pad.x),
      y: inkTop + ERASE_Y - (spongeBox.top + pad.y),
    });
  };

  // The date line rewraps across breakpoints, so the stroke is measured again
  // once both emoji are parked and the boxes mean something.
  useEffect(() => {
    if (!width || (phase !== "rest" && phase !== "signed")) return;
    const fit = () => measure();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  });

  /**
   * The button wiggles its emoji on every click and now and then on its own.
   * Both sit on the span around the pencil, and a pencil that shakes while it
   * writes looks broken, so they are stopped for the length of a run.
   */
  const stopWiggle = () => {
    for (const animation of penButtonRef.current?.firstElementChild?.getAnimations() ?? []) {
      animation.cancel();
    }
  };

  const sign = () =>
    run(async () => {
      stopWiggle();
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
      measure();
      setPhase("raise");
      await wait(reduceMotion ? 0 : LIFT_MS);
      setPhase("erase");
      await wait(reduceMotion ? 300 : ERASE_MS);
      setPhase("rest");
    });

  const registerClick = useEasterEgg("pen", { clicks: CLICKS, onTrigger: sign });

  const writing = phase === "lift" || phase === "draw" || phase === "back";
  const wiping = phase === "raise" || phase === "erase";
  // The pen rides out with the ink and comes back with the second stroke.
  const penX = writing ? start.x + (phase === "draw" ? width - 4 : 0) : 0;
  const penY = writing ? start.y + (phase === "back" ? FLOURISH_Y - INK_Y : 0) : 0;
  const penMs = phase === "draw" ? DRAW_MS : phase === "back" ? BACK_MS : LIFT_MS;
  // The sponge starts at the far end of the ink and wipes back to the front.
  const spongeX = wiping ? wipe.x + (phase === "raise" ? width - 4 : 0) : 0;

  const parked = phase === "rest" || phase === "signed";
  const underline = phase !== "rest" && phase !== "lift";
  const flourish = underline && phase !== "draw";
  // The sponge takes the ink with it as it goes.
  const rubbedOut = phase === "erase";

  return (
    <>
      <EmojiButton
        ref={penButtonRef}
        label="Pencil"
        // The pencil writes over the date and its ink, never under them.
        className="z-10"
        // Wiggling is for the pencil at rest; it holds still while it writes.
        hint={parked}
        onClick={() => {
          if (!busyRef.current && phase === "rest") registerClick();
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
            y: { duration: (phase === "lift" ? LIFT_MS : 140) / 1000 },
          }}
        >
          <Sprite name="✏️" />
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
              animate={{ pathLength: underline && !rubbedOut ? 1 : 0, opacity: underline ? 1 : 0 }}
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
              // disappearing under the sponge.
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
      <AnimatePresence>
        {(phase === "signed" || wiping) && (
          <motion.span
            key="sponge"
            className="relative z-10 ml-1 inline-block"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.25 } }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
          >
            <EmojiButton
              label="Sponge"
              // It only ever turns up once there is something to wipe off.
              hint={false}
              onClick={() => {
                if (!busyRef.current && phase === "signed") erase();
              }}
            >
              <motion.span
                ref={spongeRef}
                className="inline-block"
                animate={reduceMotion ? {} : { x: spongeX, y: wiping ? wipe.y : 0 }}
                transition={{
                  duration: (phase === "erase" ? ERASE_MS : LIFT_MS) / 1000,
                  ease: "easeInOut",
                  y: { duration: LIFT_MS / 1000 },
                }}
              >
                <Sprite name="🧽" />
              </motion.span>
            </EmojiButton>
          </motion.span>
        )}
      </AnimatePresence>
    </>
  );
};

export default PenEgg;

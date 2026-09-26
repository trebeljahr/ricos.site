import { type RefObject, useEffect, useRef, useState } from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { PageLayer, pageBox } from "../PageLayer";

const DINO_SIZE = 48;
// How much of the dinosaur shows past the screen edge: just the tail.
const PEEK = 24;
// Room above the dinosaur for the hop and the walking bob. The emoji also
// draws well outside its own font box, so both margins are measured from the
// ink rather than from the 48px box.
const HEADROOM = 34;
const WALK_PX_PER_S = 165;
const TURN_MS = 560;
// One full stride: two footfalls. Short enough that the feet keep up with the
// ground speed, so the walk reads as strides rather than a float.
const STRIDE_MS = 420;
// Clearance under the feet, for the emoji's descender plus the dip and the
// tilt of a footfall.
const FOOTROOM = 26;
// A walking dinosaur carries its weight forward, so the body keeps a small
// constant tilt and the gait rocks around it.
const LEAN = 1.6;
const RETURN_AFTER_MS = 4000;

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Row = { top: number; width: number; scrollX: number };

/**
 * Easter egg for /timeline: a dinosaur hides past the right edge of the screen
 * with only its tail showing. The tail wiggles now and then. Click it and the
 * dinosaur turns around and walks across the screen.
 */
const DinoTail = ({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) => {
  const recordFind = useRecordEggFind();
  const dinoRef = useRef<HTMLSpanElement>(null);
  // Travel and gait live on separate elements. Sharing one would compose the
  // gait's rotation with the long walking translation, and a rotated
  // translation throws the dinosaur tens of pixels up and down.
  const gaitRef = useRef<HTMLSpanElement>(null);
  const [row, setRow] = useState<Row | null>(null);
  const [walking, setWalking] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Line up with the anchor (the page title) and follow resizes.
  useEffect(() => {
    const measure = () => {
      const anchor = anchorRef.current?.querySelector("h1") ?? anchorRef.current;
      if (!anchor) return;
      const box = pageBox(anchor);
      setRow({
        // Puts the dinosaur itself, not its clipping strip, level with the title.
        top: box.top + box.height / 2 - DINO_SIZE / 2 - HEADROOM,
        width: document.documentElement.clientWidth,
        scrollX: window.scrollX,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [anchorRef]);

  // Coming back, it backs in past the edge rather than appearing there.
  const wasAway = useRef(false);
  useEffect(() => {
    if (hidden) {
      wasAway.current = true;
      return;
    }
    if (!wasAway.current) return;
    wasAway.current = false;
    if (calm()) return;
    dinoRef.current?.animate(
      [
        { transform: `translateX(${PEEK + 12}px) scaleX(-1)` },
        { transform: "translateX(0) scaleX(-1)" },
      ],
      { duration: 800, easing: "ease-out" },
    );
  }, [hidden]);

  // An occasional wiggle so the tail reads as alive and clickable.
  useEffect(() => {
    if (walking || hidden || calm()) return;
    const timer = window.setInterval(() => {
      dinoRef.current?.animate(
        [
          { rotate: "0deg" },
          { rotate: "-9deg" },
          { rotate: "7deg" },
          { rotate: "-4deg" },
          { rotate: "0deg" },
        ],
        { duration: 600, easing: "ease-in-out" },
      );
    }, 3200);
    return () => window.clearInterval(timer);
  }, [walking, hidden]);

  const walk = async () => {
    const dino = dinoRef.current;
    if (walking || !dino || !row) return;
    setWalking(true);
    recordFind("dino");

    if (calm()) {
      await dino.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" })
        .finished;
    } else {
      // Turn around with a hop. Mirroring a flat emoji has to pass through
      // zero width, so the flip happens at the top of the hop and lasts about
      // a tenth of a second: it reads as a spin rather than a blink.
      await dino.animate(
        [
          { transform: "translateX(0) translateY(0) scale(-1, 1)" },
          {
            transform: "translateX(-14px) translateY(-15px) scale(-1, 1.06)",
            offset: 0.36,
          },
          {
            transform: "translateX(-34px) translateY(-16px) scale(1, 1.06)",
            offset: 0.54,
          },
          {
            transform: `translateX(-${DINO_SIZE}px) translateY(0) scale(1.1, 0.9)`,
            offset: 0.84,
          },
          { transform: `translateX(-${DINO_SIZE}px) translateY(0) scale(1, 1)` },
        ],
        { duration: TURN_MS, easing: "ease-in-out", fill: "forwards" },
      ).finished;
      const distance = row.width + DINO_SIZE;
      // Two footfalls a stride. Each one dips and squashes on contact, then
      // pushes off and stretches through the pass. The body rocks from side to
      // side as the weight changes feet, around a slight forward lean, and
      // leaving the ground is fast while the top of the arc is slow.
      const steps = gaitRef.current?.animate(
        [
          { transform: `translateY(2px) rotate(${LEAN - 2.2}deg) scale(1.06, 0.94)` },
          {
            transform: `translateY(-7px) rotate(${LEAN}deg) scale(0.97, 1.05)`,
            offset: 0.25,
            easing: "ease-out",
          },
          {
            transform: `translateY(2px) rotate(${LEAN + 2.2}deg) scale(1.06, 0.94)`,
            offset: 0.5,
            easing: "ease-in",
          },
          {
            transform: `translateY(-7px) rotate(${LEAN}deg) scale(0.97, 1.05)`,
            offset: 0.75,
            easing: "ease-out",
          },
          {
            transform: `translateY(2px) rotate(${LEAN - 2.2}deg) scale(1.06, 0.94)`,
            easing: "ease-in",
          },
        ],
        { duration: STRIDE_MS, iterations: Number.POSITIVE_INFINITY },
      );
      await dino.animate(
        [
          { transform: `translateX(-${DINO_SIZE}px) scaleX(1)` },
          { transform: `translateX(-${distance + DINO_SIZE}px) scaleX(1)` },
        ],
        { duration: (distance / WALK_PX_PER_S) * 1000, easing: "linear", fill: "forwards" },
      ).finished;
      steps?.cancel();
    }
    setHidden(true);
    setWalking(false);
    // Back behind the edge a little later, tail first.
    window.setTimeout(() => setHidden(false), RETURN_AFTER_MS);
  };

  if (!row || hidden) return null;

  return (
    <PageLayer>
      {/* Clipped to the viewport width, so the hidden body never adds scroll. */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: row.scrollX,
          top: row.top,
          width: row.width,
          height: HEADROOM + DINO_SIZE + FOOTROOM,
        }}
      >
        <button
          type="button"
          aria-label="Dinosaur tail"
          onClick={walk}
          className="pointer-events-auto absolute cursor-pointer appearance-none border-0 bg-transparent p-0 leading-none"
          style={{
            left: row.width - PEEK,
            bottom: FOOTROOM,
            width: walking ? DINO_SIZE : PEEK,
            height: DINO_SIZE,
          }}
        >
          <span
            ref={dinoRef}
            aria-hidden="true"
            className="absolute bottom-0 left-0 inline-block origin-[50%_80%]"
            // The emoji faces left; mirrored it faces away, tail first toward the page.
            style={{ transform: "scaleX(-1)" }}
          >
            <span
              ref={gaitRef}
              className="inline-block origin-[50%_100%]"
              style={{ fontSize: DINO_SIZE, lineHeight: 1 }}
            >
              🦕
            </span>
          </span>
        </button>
      </div>
    </PageLayer>
  );
};

export default DinoTail;

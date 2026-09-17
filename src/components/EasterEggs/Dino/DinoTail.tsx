import { type RefObject, useEffect, useRef, useState } from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { PageLayer, pageBox } from "../PageLayer";

const DINO_SIZE = 48;
// How much of the dinosaur shows past the screen edge: just the tail.
const PEEK = 24;
const WALK_PX_PER_S = 130;
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
        top: box.top + box.height / 2 - DINO_SIZE / 2 - 6,
        width: document.documentElement.clientWidth,
        scrollX: window.scrollX,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [anchorRef]);

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
      // Turn around: the head swings into view.
      await dino.animate(
        [
          { transform: "translateX(0) scaleX(-1)" },
          { transform: `translateX(-${DINO_SIZE}px) scaleX(-1)`, offset: 0.5 },
          { transform: `translateX(-${DINO_SIZE}px) scaleX(1)` },
        ],
        { duration: 700, easing: "ease-in-out", fill: "forwards" },
      ).finished;
      const distance = row.width + DINO_SIZE;
      const steps = dino.animate(
        [
          { translate: "0 0", rotate: "-2deg" },
          { translate: "0 -5px", rotate: "2deg" },
          { translate: "0 0", rotate: "-2deg" },
        ],
        { duration: 520, iterations: Number.POSITIVE_INFINITY },
      );
      await dino.animate(
        [
          { transform: `translateX(-${DINO_SIZE}px) scaleX(1)` },
          { transform: `translateX(-${distance + DINO_SIZE}px) scaleX(1)` },
        ],
        { duration: (distance / WALK_PX_PER_S) * 1000, easing: "linear", fill: "forwards" },
      ).finished;
      steps.cancel();
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
        style={{ left: row.scrollX, top: row.top, width: row.width, height: DINO_SIZE + 12 }}
      >
        <button
          type="button"
          aria-label="Dinosaur tail"
          onClick={walk}
          className="pointer-events-auto absolute bottom-0 cursor-pointer appearance-none border-0 bg-transparent p-0 leading-none"
          style={{ left: row.width - PEEK, width: walking ? DINO_SIZE : PEEK, height: DINO_SIZE }}
        >
          <span
            ref={dinoRef}
            aria-hidden="true"
            className="absolute bottom-0 left-0 inline-block origin-[50%_80%]"
            // The emoji faces left; mirrored it faces away, tail first toward the page.
            style={{ fontSize: DINO_SIZE, lineHeight: 1, transform: "scaleX(-1)" }}
          >
            🦕
          </span>
        </button>
      </div>
    </PageLayer>
  );
};

export default DinoTail;

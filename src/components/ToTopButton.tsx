import { FiArrowUp } from "@components/Icons";
import { useEffect, useRef } from "react";
import { ShowAfterScrolling } from "./ShowAfterScrolling";
import { SparkleGlyph } from "./Sparkles";

const MIN_TRIP_MS = 260;
const MAX_TRIP_MS = 820;
const ABORT_EVENTS = ["wheel", "touchstart", "keydown"] as const;

// Fixed sizes rather than random ones: the markup has to match on the server.
// Every click then randomises the flight, which only ever happens in the browser.
const GLITTER_SIZES = [11, 7, 14, 9, 12, 6, 10, 8, 13, 7];

// Pull away from the click, coast, arrive slowly. The native "smooth" scroll
// starts at full speed and stops dead, which is what makes it feel mechanical.
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function ToTopButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const glitterRef = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const stopTrip = useRef<() => void>(() => {});

  useEffect(() => () => stopTrip.current(), []);

  // A handful of sparkles thrown up out of the button, each on its own arc,
  // drifting back down as it fades. The same pool of spans every time.
  const throwGlitter = () => {
    for (const sparkle of glitterRef.current?.querySelectorAll<HTMLElement>("[data-sparkle]") ??
      []) {
      // A second click throws fresh glitter rather than stacking two flights.
      for (const flight of sparkle.getAnimations()) flight.cancel();
      // Fan upwards: straight up in the middle, out to the sides at the edges.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      const reach = 26 + Math.random() * 34;
      const x = Math.cos(angle) * reach;
      const y = Math.sin(angle) * reach;
      sparkle.animate(
        [
          { translate: "0 0", scale: 0.2, rotate: "0deg", opacity: 0 },
          { translate: `${x * 0.5}px ${y * 0.55}px`, scale: 1, opacity: 1, offset: 0.35 },
          { translate: `${x}px ${y + 14}px`, scale: 0.35, rotate: "160deg", opacity: 0 },
        ],
        {
          duration: 540 + Math.random() * 280,
          delay: Math.random() * 90,
          easing: "cubic-bezier(0.18, 0.7, 0.3, 1)",
        },
      );
    }
  };

  const handleClick = () => {
    const start = window.scrollY;
    if (start === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, 0);
      return;
    }

    stopTrip.current();
    throwGlitter();

    // Long pages take longer, but not proportionally: a 12000px page would crawl.
    const duration = Math.min(MAX_TRIP_MS, Math.max(MIN_TRIP_MS, Math.sqrt(start) * 11));
    const began = performance.now();

    // A wheel, a touch or a key during the trip means the reader changed their mind.
    const abort = () => stopTrip.current();
    const stop = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      for (const type of ABORT_EVENTS) window.removeEventListener(type, abort);
      stopTrip.current = () => {};
    };
    stopTrip.current = stop;
    for (const type of ABORT_EVENTS) {
      window.addEventListener(type, abort, { passive: true });
    }

    const step = (now: number) => {
      const t = Math.min(1, (now - began) / duration);
      window.scrollTo(0, start * (1 - easeInOutCubic(t)));
      if (t < 1) {
        frame.current = requestAnimationFrame(step);
        return;
      }
      stop();
      // One small bob at the end, so the arrival reads as arrival.
      buttonRef.current?.animate(
        [{ translate: "0 0" }, { translate: "0 -3px", offset: 0.4 }, { translate: "0 0" }],
        { duration: 240, easing: "ease-out" },
      );
    };
    frame.current = requestAnimationFrame(step);
  };

  return (
    <ShowAfterScrolling>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className="fixed bottom-[2vmin] right-[2vmin] cursor-pointer w-fit h-fit p-2 rounded-full flex justify-center items-center z-10 border-none bg-blue-300 text-center hover:bg-blue-400 sm:bottom-[4vmin] sm:right-[8vmin] text-black motion-safe:transition-[translate,scale,background-color] motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-[2px] active:translate-y-[1px] active:scale-90"
        aria-label="Scroll to top"
      >
        <span
          ref={glitterRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-visible"
        >
          {GLITTER_SIZES.map((size, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed pool, never reordered
              key={index}
              data-sparkle
              className="absolute left-1/2 top-1/2 block opacity-0"
              style={{ marginLeft: -size / 2, marginTop: -size / 2 }}
            >
              <SparkleGlyph size={size} className="block" />
            </span>
          ))}
        </span>
        <FiArrowUp className="w-8 h-8" />
      </button>
    </ShowAfterScrolling>
  );
}

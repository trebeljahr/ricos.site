import { FiArrowUp } from "@components/Icons";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { ShowAfterScrolling } from "./ShowAfterScrolling";

const RAPID_WINDOW_MS = 1500;
const ROCKET_CLICKS = 3;
const RING_RADIUS = 21;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// One loop of the arrow leaving through the top and rising back in from below,
// so a long scroll shows several arrows travelling up rather than one static icon.
const ARROW_RIDE: Keyframe[] = [
  { translate: "0 0", scale: "1 1", opacity: 1 },
  { translate: "0 3px", scale: "1.15 0.75", opacity: 1, offset: 0.12 },
  { translate: "0 -14px", scale: "0.92 1.2", opacity: 1, offset: 0.4 },
  { translate: "0 -26px", scale: "0.92 1.2", opacity: 0, offset: 0.48 },
  { translate: "0 26px", scale: "1 1", opacity: 0, offset: 0.5 },
  { translate: "0 0", scale: "1 1", opacity: 1 },
];

export function ToTopButton() {
  const [rocket, setRocket] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const linesRef = useRef<HTMLSpanElement>(null);
  const rocketRef = useRef<HTMLSpanElement>(null);
  const clickTimes = useRef<number[]>([]);

  // The ring drains as the page travels up, so the click has a visible result.
  // It writes the attribute straight to the circle: a state update per scroll
  // frame would re-render the button on every page on every scroll.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = `${RING_LENGTH * (1 - progress)}`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Spamming the button launches an actual rocket, once per burst.
  useEffect(() => {
    if (!rocket) return;
    const el = rocketRef.current;
    if (!el) return;
    let cancelled = false;
    const ride = el.animate(
      [
        { translate: "0 0", rotate: "0deg", scale: "0.6", opacity: 0 },
        {
          translate: "0 6px",
          rotate: "-4deg",
          scale: "1",
          opacity: 1,
          offset: 0.12,
        },
        {
          translate: "-6px -35vh",
          rotate: "6deg",
          scale: "1",
          opacity: 1,
          offset: 0.6,
        },
        { translate: "4px -85vh", rotate: "-6deg", scale: "0.7", opacity: 0 },
      ],
      { duration: 1100, easing: "cubic-bezier(0.3, 0, 0.5, 1)" },
    );
    for (const [index, puff] of [...el.querySelectorAll<HTMLElement>("[data-puff]")].entries()) {
      puff.animate(
        [
          { translate: "0 0", scale: "0.2", opacity: 0.7 },
          {
            translate: `${index % 2 ? 10 : -10}px 26px`,
            scale: "1.6",
            opacity: 0,
          },
        ],
        { duration: 700, delay: 120 + index * 110, easing: "ease-out" },
      );
    }
    ride.finished
      .then(() => {
        if (!cancelled) setRocket(false);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      ride.cancel();
    };
  }, [rocket]);

  const handleClick = () => {
    const calm = reduceMotion();
    window.scrollTo({ top: 0, left: 0, behavior: calm ? "auto" : "smooth" });
    if (calm) return;

    const now = Date.now();
    clickTimes.current = [...clickTimes.current.filter((t) => now - t < RAPID_WINDOW_MS), now];
    const launching = clickTimes.current.length >= ROCKET_CLICKS;
    if (launching) {
      clickTimes.current = [];
      // Rides from the clicks that built up to this one would keep the arrow
      // opaque, and CSS cannot hide an element a running animation is painting.
      for (const ride of arrowRef.current?.getAnimations() ?? []) ride.cancel();
      setRocket(true);
    }

    // Longer trips keep the arrow cycling, so the button stays busy while the page
    // flies. The rocket takes the arrow's place, so it rides alone.
    if (!launching) {
      const loops = Math.min(4, Math.max(1, Math.round(window.scrollY / 700)));
      arrowRef.current?.animate(ARROW_RIDE, {
        duration: 520,
        iterations: loops,
        easing: "cubic-bezier(0.32, 0, 0.3, 1)",
      });
    }
    buttonRef.current?.animate(
      [
        { translate: "0 0", scale: "1" },
        { translate: "0 4px", scale: "0.92", offset: 0.15 },
        { translate: "0 -3px", scale: "1.06", offset: 0.45 },
        { translate: "0 0", scale: "1" },
      ],
      { duration: 460, easing: "ease-out" },
    );
    for (const [index, line] of [
      ...(linesRef.current?.querySelectorAll<HTMLElement>("[data-line]") ?? []),
    ].entries()) {
      line.animate(
        [
          { translate: "0 14px", scale: "1 0.4", opacity: 0 },
          { translate: "0 -6px", scale: "1 1", opacity: 0.55, offset: 0.4 },
          { translate: "0 -30px", scale: "1 0.5", opacity: 0 },
        ],
        { duration: 520, delay: index * 60, easing: "ease-out" },
      );
    }
  };

  return (
    <ShowAfterScrolling>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className="group fixed bottom-[2vmin] right-[2vmin] cursor-pointer w-fit h-fit p-2 rounded-full flex justify-center items-center z-10 border-none bg-blue-300 text-center hover:bg-blue-400 sm:bottom-[4vmin] sm:right-[8vmin] text-black"
        aria-label="Scroll to top"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 48 48"
          className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
        >
          <circle
            ref={ringRef}
            cx="24"
            cy="24"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH}
            className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-150"
          />
        </svg>

        <span
          ref={linesRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
        >
          <span
            data-line
            className="absolute left-[30%] top-1/2 h-4 w-[2px] rounded-full bg-black/40 opacity-0"
          />
          <span
            data-line
            className="absolute left-1/2 top-1/2 h-5 w-[2px] rounded-full bg-black/40 opacity-0"
          />
          <span
            data-line
            className="absolute left-[68%] top-1/2 h-4 w-[2px] rounded-full bg-black/40 opacity-0"
          />
        </span>

        {rocket && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2"
          >
            <span ref={rocketRef} className="relative block text-2xl leading-none">
              🚀
              <span
                data-puff
                className="absolute -bottom-1 left-1 h-2 w-2 rounded-full bg-black/25"
              />
              <span
                data-puff
                className="absolute -bottom-1 right-1 h-2 w-2 rounded-full bg-black/25"
              />
              <span
                data-puff
                className="absolute -bottom-2 left-1/2 h-2 w-2 rounded-full bg-black/25"
              />
            </span>
          </span>
        )}

        <span className="block overflow-hidden rounded-full">
          <span
            ref={arrowRef}
            className={clsx(
              "block motion-safe:transition-transform motion-safe:duration-200 group-hover:-translate-y-[2px]",
              rocket && "opacity-0",
            )}
          >
            <FiArrowUp className="w-8 h-8" />
          </span>
        </span>
      </button>
    </ShowAfterScrolling>
  );
}

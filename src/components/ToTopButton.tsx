import { FiArrowUp } from "@components/Icons";
import { useEffect, useRef } from "react";
import { GlitterPool, useGlitter } from "./Glitter";
import { ShowAfterScrolling } from "./ShowAfterScrolling";

const MIN_TRIP_MS = 260;
const MAX_TRIP_MS = 820;
const ABORT_EVENTS = ["wheel", "touchstart", "keydown"] as const;

// Pull away from the click, coast, arrive slowly. The native "smooth" scroll
// starts at full speed and stops dead, which is what makes it feel mechanical.
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

type Props = {
  /** Replaces the scroll animation entirely, for pages where the top of the
   *  document is not the top of the content.
   *
   *  The spectrum is one: it keeps a moving window of a few hundred photos in
   *  the document, so scrolling to offset zero lands on whatever the window
   *  currently starts at — photo 1,264, say — rather than on the first
   *  photograph. Worse, the trip up triggers that page's backwards loading,
   *  which inserts rows above the reader and corrects the scroll position to
   *  compensate, so the animation and the correction fight and the button
   *  stops somewhere arbitrary.
   *
   *  Such a page passes a handler that resets its own window instead. */
  onScrollToTop?: () => void;
};

export function ToTopButton({ onScrollToTop }: Props = {}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { glitterRef, burst } = useGlitter();
  const frame = useRef(0);
  const stopTrip = useRef<() => void>(() => {});

  useEffect(() => () => stopTrip.current(), []);

  // Chrome, Edge and Safari park the button above the footer in CSS (see
  // .lift-above-footer). Firefox, without scroll timelines, gets it from here.
  // The check matches the CSS @supports, so exactly one of the two runs.
  useEffect(() => {
    if (CSS.supports("(animation-timeline: view()) and (timeline-scope: none)")) return;
    const button = buttonRef.current;
    const footer = document.querySelector<HTMLElement>(".site-footer");
    if (!button || !footer) return;

    let raf = 0;
    const lift = () => {
      raf = 0;
      const showing = window.innerHeight - footer.getBoundingClientRect().top;
      button.style.transform = showing > 0 ? `translateY(${-showing}px)` : "";
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(lift);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    lift();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const handleClick = () => {
    if (onScrollToTop) {
      burst("up");
      onScrollToTop();
      return;
    }
    const start = window.scrollY;
    if (start === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.scrollTo(0, 0);
      return;
    }

    stopTrip.current();
    burst("up");

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
    <ShowAfterScrolling afterScreens={1}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        className="lift-above-footer fixed bottom-[2vmin] right-[2vmin] cursor-pointer w-fit h-fit p-2 rounded-full flex justify-center items-center z-10 border-none bg-blue-300 text-center hover:bg-blue-400 sm:bottom-[4vmin] sm:right-[8vmin] text-black motion-safe:transition-[translate,scale,background-color] motion-safe:duration-150 motion-safe:ease-out hover:-translate-y-[2px] active:translate-y-[1px] active:scale-90"
        aria-label="Scroll to top"
      >
        <GlitterPool ref={glitterRef} />
        <FiArrowUp className="w-8 h-8" />
      </button>
    </ShowAfterScrolling>
  );
}

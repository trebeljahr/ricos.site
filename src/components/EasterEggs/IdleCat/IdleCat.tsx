import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { recordEggFind } from "src/lib/easterEggs";

const CAT_SIZE = 36;
const WALK_PX_PER_S = 110;

/**
 * A cat walks in from the right along the bottom of the screen, or along the
 * footer's top edge when the footer is in view, curls up and naps. Scrolling
 * wakes it and it runs off. Fixed and click-through.
 */
const IdleCat = ({ onGone }: { onGone: () => void }) => {
  const walkerRef = useRef<HTMLSpanElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const onGoneRef = useRef(onGone);
  onGoneRef.current = onGone;
  const [napping, setNapping] = useState(false);

  // Measured once when the cat arrives.
  const [spot] = useState(() => {
    const width = document.documentElement.clientWidth;
    // The site footer is the last <footer> on the page (articles have their own).
    const footers = document.querySelectorAll("footer");
    const footer = footers[footers.length - 1]?.getBoundingClientRect();
    const footerInView = footer && footer.top > 80 && footer.top < window.innerHeight;
    return {
      width,
      bottom: footerInView ? window.innerHeight - footer.top : 0,
      restX: Math.round(width * (width < 640 ? 0.55 : 0.7)),
    };
  });

  useEffect(() => {
    const walker = walkerRef.current;
    const body = bodyRef.current;
    if (!walker || !body) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startX = spot.width + 10;
    const distance = startX - spot.restX;
    const animations: Animation[] = [];
    let awake = true;

    const runOff = () => {
      if (!awake) return;
      awake = false;
      for (const a of animations) a.cancel();
      setNapping(false);
      if (calm) {
        walker
          .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" })
          .finished.then(() => onGoneRef.current())
          .catch(() => undefined);
        return;
      }
      // Startled hop, then a dash off the right edge.
      body.animate([{ translate: "0 0" }, { translate: "0 -18px" }, { translate: "0 0" }], {
        duration: 260,
        easing: "ease-out",
      });
      walker
        .animate(
          [
            { transform: `translateX(${spot.restX}px) scaleX(-1)` },
            { transform: `translateX(${spot.width + 60}px) scaleX(-1)` },
          ],
          { duration: 700, delay: 200, easing: "ease-in", fill: "forwards" },
        )
        .finished.then(() => onGoneRef.current())
        .catch(() => undefined);
    };

    const nap = () => {
      if (!awake) return;
      setNapping(true);
      recordEggFind("idle-cat");
      window.addEventListener("scroll", runOff, { passive: true, once: true });
      window.addEventListener("wheel", runOff, { passive: true, once: true });
      window.addEventListener("touchmove", runOff, { passive: true, once: true });
    };

    if (calm) {
      walker.style.transform = `translateX(${spot.restX}px)`;
      animations.push(
        walker.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, fill: "forwards" }),
      );
      nap();
    } else {
      const walk = walker.animate(
        [{ transform: `translateX(${startX}px)` }, { transform: `translateX(${spot.restX}px)` }],
        { duration: (distance / WALK_PX_PER_S) * 1000, easing: "linear", fill: "forwards" },
      );
      const steps = body.animate(
        [
          { translate: "0 0", rotate: "-3deg" },
          { translate: "0 -3px", rotate: "3deg" },
          { translate: "0 0", rotate: "-3deg" },
        ],
        { duration: 380, iterations: Number.POSITIVE_INFINITY },
      );
      animations.push(walk, steps);
      walk.finished
        .then(() => {
          steps.cancel();
          // Turn around once, then curl up.
          return body.animate(
            [
              { transform: "scale(1, 1)" },
              { transform: "scale(-1, 1)", offset: 0.3 },
              { transform: "scale(1, 1)", offset: 0.6 },
              { transform: "scale(1.15, 0.7)" },
            ],
            { duration: 1100, easing: "ease-in-out", fill: "forwards" },
          ).finished;
        })
        .then(nap)
        .catch(() => undefined);
    }
    // Scrolling during the walk in scares it off too.
    const early = () => runOff();
    window.addEventListener("scroll", early, { passive: true, once: true });

    return () => {
      awake = false;
      for (const a of animations) a.cancel();
      window.removeEventListener("scroll", early);
      window.removeEventListener("scroll", runOff);
      window.removeEventListener("wheel", runOff);
      window.removeEventListener("touchmove", runOff);
    };
  }, [spot]);

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 z-50 overflow-hidden"
      style={{ bottom: spot.bottom, height: CAT_SIZE * 2.5 }}
    >
      <span
        ref={walkerRef}
        className="absolute bottom-0 left-0 inline-block"
        style={{ transform: `translateX(${spot.width + 10}px)` }}
      >
        <span
          ref={bodyRef}
          className="inline-block origin-bottom leading-none"
          style={{ fontSize: CAT_SIZE }}
        >
          🐈
        </span>
        {napping && (
          <span className="absolute -top-2 left-3/4 text-base">
            {["z", "z", "Z"].map((letter, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed three letters
                key={i}
                className="absolute font-bold text-gray-500 motion-safe:animate-egg-snooze dark:text-gray-300"
                style={{ animationDelay: `${i * 0.8}s`, fontSize: 11 + i * 3 }}
              >
                {letter}
              </span>
            ))}
          </span>
        )}
      </span>
    </div>,
    document.body,
  );
};

export default IdleCat;

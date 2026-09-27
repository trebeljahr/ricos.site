import { type RefObject, useCallback, useRef } from "react";
import { SparkleGlyph } from "./Sparkles";

// Fixed sizes rather than random ones: the markup has to match on the server.
// Every burst then randomises the flight, which only ever happens in the browser.
const GLITTER_SIZES = [11, 7, 14, 9, 12, 6, 10, 8, 13, 7];

const DIRECTIONS = {
  up: -Math.PI / 2,
  left: Math.PI,
  right: 0,
} as const;

export type GlitterDirection = keyof typeof DIRECTIONS;

/**
 * A handful of sparkles thrown out of a control, each on its own arc, drifting
 * back down as it fades. Render `<GlitterPool ref={glitterRef} />` inside the
 * control and call `burst()` when it is used.
 */
export function useGlitter() {
  const glitterRef = useRef<HTMLSpanElement>(null);

  const burst = useCallback((direction: GlitterDirection = "up") => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const sparkle of glitterRef.current?.querySelectorAll<HTMLElement>("[data-sparkle]") ??
      []) {
      // A second press throws fresh glitter rather than stacking two flights.
      for (const flight of sparkle.getAnimations()) flight.cancel();
      // Fan out around the direction of travel: dead on in the middle of the
      // spread, out to the sides at its edges.
      const angle = DIRECTIONS[direction] + (Math.random() - 0.5) * 2.2;
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
  }, []);

  return { glitterRef, burst };
}

export function GlitterPool({ ref }: { ref: RefObject<HTMLSpanElement | null> }) {
  return (
    <span
      ref={ref}
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
  );
}

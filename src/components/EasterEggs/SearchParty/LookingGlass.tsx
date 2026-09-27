import { type RefObject, useEffect, useRef } from "react";

export type Point = { x: number; y: number };

type GlassProps = {
  /** Where the pointer is, in client pixels, or null when it is away. */
  pointerRef: RefObject<Point | null>;
  /** No easing for a reader who asked for less movement: the glass keeps up. */
  calm: boolean;
  /** Called with false where the browser cannot blur a backdrop. */
  onReady: (ok: boolean) => void;
};

/** How lazily the glass follows the pointer. */
const EASE = 0.22;
/** Half-width of the clear middle, as a share of the smaller screen side. */
const REACH = 0.19;
/** Where the clear middle gives way to the blur, across that reach. */
const EDGE = 58;

/** The frost: static noise, so the sheet is not a flat wash of blur. */
const FROST =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23f)'/%3E%3C/svg%3E\")";

const canBlur = () =>
  typeof CSS !== "undefined" &&
  (CSS.supports("backdrop-filter", "blur(1px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(1px)"));

/**
 * A sheet of frosted glass over the whole page, with one clear round patch in
 * it that follows the pointer: a looking glass. Everything is behind the sheet
 * the whole time — the words, the links, the picture — blurred past reading
 * until the patch passes over it, and blurred again the moment it moves on.
 * Nothing is drawn and nothing is kept: the blur is the browser's own, and the
 * patch is a single radial gradient masking it.
 */
export const LookingGlass = ({ pointerRef, calm, onReady }: GlassProps) => {
  const paneRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || !canBlur()) {
      onReadyRef.current(false);
      return;
    }
    onReadyRef.current(true);

    let glass: Point | null = null;
    let open = 0;
    let painted = "";
    let frame = 0;

    const draw = () => {
      const target = pointerRef.current;
      // Nobody is looking and the patch has closed: stop until someone moves.
      if (!target && open <= 0.02) {
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(draw);
      if (target) {
        glass =
          glass && !calm
            ? { x: glass.x + (target.x - glass.x) * EASE, y: glass.y + (target.y - glass.y) * EASE }
            : target;
        open += (1 - open) * 0.14;
      } else {
        open *= 0.9;
      }

      let mask = "linear-gradient(#000, #000)";
      if (glass && open > 0.02) {
        const reach = Math.round(Math.min(innerWidth, innerHeight) * REACH * open);
        mask = `radial-gradient(${reach}px ${reach}px at ${Math.round(glass.x)}px ${Math.round(glass.y)}px, transparent 0%, transparent ${EDGE}%, #000 100%)`;
      }
      if (mask === painted) return;
      painted = mask;
      pane.style.maskImage = mask;
      pane.style.webkitMaskImage = mask;
    };

    const wake = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    pane.style.maskRepeat = "no-repeat";
    pane.style.maskSize = "100% 100%";
    pane.style.webkitMaskRepeat = "no-repeat";
    pane.style.webkitMaskSize = "100% 100%";
    window.addEventListener("pointermove", wake, { passive: true });
    window.addEventListener("keydown", wake);
    frame = window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("keydown", wake);
    };
  }, [calm, pointerRef]);

  return (
    <div ref={paneRef} className="absolute inset-0 backdrop-blur-[14px] backdrop-brightness-[1.02]">
      <div
        className="absolute inset-0 opacity-[0.14] mix-blend-overlay"
        style={{ backgroundImage: FROST }}
      />
    </div>
  );
};

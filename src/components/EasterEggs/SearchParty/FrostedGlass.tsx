import { type RefObject, useEffect, useRef } from "react";

export type Point = { x: number; y: number };

type GlassProps = {
  /** Where the pointer is, in client pixels, or null when it is away. */
  pointerRef: RefObject<Point | null>;
  /** Called every frame with the trailing focus, so the egg can pick things up. */
  onFocus: (x: number, y: number) => void;
  /** No easing for a reader who asked for less movement: the hole keeps up. */
  calm: boolean;
  /** Called with false where the browser cannot cut holes in the glass. */
  onReady: (ok: boolean) => void;
  /** What the glass stays clear of: everything the search has already found. */
  clearRef: RefObject<HTMLElement[]>;
};

/** How many holes the glass can be holding open at once, the pointer aside. */
const CLEARINGS = 12;
/** How far a hole reaches past what was found. */
const FEATHER = 64;
/** How lazily the hole follows the pointer: it drifts after it. */
const EASE = 0.16;
/** Reach of the hole under the pointer, as a share of the smaller screen side. */
const REACH = 0.3;
/** Where the hole stops being a hole and the glass starts, across that reach. */
const EDGE = 52;

/** The frost itself: static noise, so the glass is not a flat sheet of colour. */
const FROST =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23f)'/%3E%3C/svg%3E\")";

/** Glass needs a blurred backdrop and holes cut out of it; without both there
    is no way to show a page that cannot be read, so the egg stands aside. */
const canFrost = () =>
  typeof CSS !== "undefined" &&
  CSS.supports("mask-composite", "intersect") &&
  (CSS.supports("backdrop-filter", "blur(1px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(1px)"));

/** One hole in the sheet: clear in the middle, glass again by the rim. */
const hole = (x: number, y: number, rx: number, ry: number) =>
  `radial-gradient(${Math.round(rx)}px ${Math.round(ry)}px at ${Math.round(x)}px ${Math.round(y)}px, transparent 0%, transparent ${EDGE}%, #000 100%)`;

/**
 * A sheet of dark frosted glass over the page. The page is behind it the whole
 * time — blurred past reading, but there — and the pointer drags a clear hole
 * about the sheet a beat behind itself. Whatever that hole finds keeps a hole
 * of its own from then on. Nothing is drawn: the blur is the browser's, and
 * the holes are a mask over it, so an untouched page costs a mask it has
 * already rasterised.
 */
export const FrostedGlass = ({ pointerRef, onFocus, calm, onReady, clearRef }: GlassProps) => {
  const paneRef = useRef<HTMLDivElement>(null);
  const onFocusRef = useRef(onFocus);
  onFocusRef.current = onFocus;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || !canFrost()) {
      onReadyRef.current(false);
      return;
    }
    onReadyRef.current(true);

    let focus: Point | null = null;
    let strength = 0;
    let painted = "";
    let frame = 0;

    const draw = () => {
      frame = window.requestAnimationFrame(draw);
      const target = pointerRef.current;
      if (target) {
        focus =
          focus && !calm
            ? { x: focus.x + (target.x - focus.x) * EASE, y: focus.y + (target.y - focus.y) * EASE }
            : target;
        strength += (1 - strength) * 0.12;
      } else {
        strength *= 0.93;
      }

      const holes: string[] = [];
      if (focus && strength > 0.02) {
        const reach = Math.min(window.innerWidth, window.innerHeight) * REACH * strength;
        holes.push(hole(focus.x, focus.y, reach, reach));
        onFocusRef.current(focus.x, focus.y);
      }
      // Read back every frame, because the page scrolls under the glass.
      for (const el of clearRef.current) {
        if (holes.length > CLEARINGS) break;
        const box = el.getBoundingClientRect();
        if (box.bottom < 0 || box.top > window.innerHeight) continue;
        holes.push(
          hole(
            box.left + box.width / 2,
            box.top + box.height / 2,
            box.width / 2 + FEATHER,
            box.height / 2 + FEATHER,
          ),
        );
      }

      // Every layer is opaque away from its own hole, so intersecting them
      // leaves glass only where no hole reaches: the holes add up.
      const mask = holes.length ? holes.join(", ") : "linear-gradient(#000, #000)";
      if (mask === painted) return;
      painted = mask;
      pane.style.maskImage = mask;
      pane.style.webkitMaskImage = mask;
    };

    pane.style.maskRepeat = "no-repeat";
    pane.style.maskSize = "100% 100%";
    pane.style.maskComposite = "intersect";
    pane.style.webkitMaskRepeat = "no-repeat";
    pane.style.webkitMaskSize = "100% 100%";
    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [calm, pointerRef, clearRef]);

  return (
    <div
      ref={paneRef}
      // Dark glass over a light page can simply be dark. Over a dark page it
      // has nothing to be darker than, so there it is a milky sheet instead.
      className="absolute inset-0 bg-gray-950/55 backdrop-blur-2xl backdrop-brightness-[0.55] backdrop-saturate-50 dark:bg-gray-200/[0.07] dark:backdrop-brightness-[0.8] dark:backdrop-saturate-[0.65]"
    >
      <div
        className="absolute inset-0 opacity-[0.22] mix-blend-overlay dark:opacity-[0.3]"
        style={{ backgroundImage: FROST }}
      />
    </div>
  );
};

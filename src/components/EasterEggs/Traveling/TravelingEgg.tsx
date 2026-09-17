import { useReducedMotion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { clampPageX, PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

const GLOBES = ["🌍", "🌎", "🌏"];
const SPIN_FRAME_MS = 130;
const TURNS = 2;
const FLIGHT_MS = 1800;
const PAD = 28;

type Flight = { left: number; top: number; width: number; height: number; d: string };

/** A dotted arc from the globe to the right edge of the section, below the heading. */
function planFlight(globe: Element): Flight | null {
  const heading = globe.closest("h2");
  const section = heading?.parentElement;
  if (!heading || !section) return null;

  const g = pageBox(globe);
  const h = pageBox(heading);
  const s = pageBox(section);
  const x0 = g.left + g.width / 2;
  const y0 = g.top + g.height / 2;
  const wantX = Math.max(s.left + s.width - 40, x0 + 140);
  const x1 = clampPageX(wantX, 0, 12 + PAD);
  // No room to the right of the globe (very narrow screens): skip the flight.
  if (x1 - x0 < 80) return null;
  const y1 = h.top + h.height + 16;
  const dx = x1 - x0;
  // Climb out of the globe, then flatten out so the plane touches down level.
  const peak = Math.min(y0, y1) - Math.max(60, dx * 0.25);

  const left = x0 - PAD;
  const top = peak - PAD;
  const width = dx + PAD * 2;
  const height = Math.max(y0, y1) - peak + PAD * 2;
  const p = (x: number, y: number) => `${Math.round(x - left)} ${Math.round(y - top)}`;
  const d = `M ${p(x0, y0)} C ${p(x0 + dx * 0.2, peak)} ${p(x1 - dx * 0.45, y1)} ${p(x1, y1)}`;
  return { left, top, width, height, d };
}

const TravelingEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const globeRef = useRef<HTMLSpanElement>(null);
  const [globe, setGlobe] = useState(GLOBES[0]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [landed, setLanded] = useState(false);

  // Plane and trail share duration and easing, so the dots appear right behind the plane.
  const flyPlane = useCallback(
    (plane: HTMLSpanElement | null) => {
      if (!plane || reduceMotion) return;
      const timing = { duration: FLIGHT_MS, easing: "ease-in-out", fill: "forwards" } as const;
      plane.animate([{ offsetDistance: "0%" }, { offsetDistance: "100%" }], timing);
      const mask = plane.parentElement?.querySelector("[data-trail]");
      mask?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], timing);
    },
    [reduceMotion],
  );

  const registerClick = useEasterEgg("traveling", {
    onTrigger: () =>
      run(async () => {
        if (!globeRef.current) return;
        if (!reduceMotion) {
          for (let i = 1; i <= GLOBES.length * TURNS; i++) {
            setGlobe(GLOBES[i % GLOBES.length]);
            await wait(SPIN_FRAME_MS);
          }
        }
        setFlight(planFlight(globeRef.current));
        await wait(reduceMotion ? 1500 : FLIGHT_MS + 600);
        setLanded(true);
        await wait(500);
        setFlight(null);
        setLanded(false);
        setGlobe(GLOBES[0]);
      }),
  });

  return (
    <>
      Traveling Stories{" "}
      <EmojiButton
        label="Globe"
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={globeRef}>{globe}</span>
      </EmojiButton>
      {flight && (
        <PageLayer>
          <div
            aria-hidden="true"
            className="absolute text-base font-normal"
            style={{
              left: flight.left,
              top: flight.top,
              width: flight.width,
              height: flight.height,
            }}
          >
            {!reduceMotion && (
              <svg
                aria-hidden="true"
                className="text-accent absolute inset-0 overflow-visible transition-opacity duration-500"
                width={flight.width}
                height={flight.height}
                style={{ opacity: landed ? 0 : 0.8 }}
              >
                <mask id="flight-trail">
                  <path
                    data-trail
                    d={flight.d}
                    pathLength={1}
                    fill="none"
                    stroke="white"
                    strokeWidth={8}
                    strokeDasharray="1 1"
                    strokeDashoffset={1}
                  />
                </mask>
                <path
                  d={flight.d}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray="0.1 9"
                  mask="url(#flight-trail)"
                />
              </svg>
            )}
            <span
              ref={flyPlane}
              className="absolute top-0 left-0 text-2xl leading-none transition-opacity duration-500"
              style={{
                offsetPath: `path("${flight.d}")`,
                offsetRotate: "auto 45deg",
                offsetDistance: reduceMotion ? "100%" : "0%",
                opacity: landed ? 0 : 1,
              }}
            >
              ✈️
            </span>
          </div>
        </PageLayer>
      )}
    </>
  );
};

export default TravelingEgg;

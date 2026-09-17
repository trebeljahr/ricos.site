import { useReducedMotion } from "motion/react";
import { useRef, useState } from "react";
import { useEasterEgg } from "src/hooks/useEasterEgg";
import { EmojiButton } from "../EmojiButton";
import { PageLayer, pageBox } from "../PageLayer";
import { useEggRunner } from "../useEggRunner";

const GLOBES = ["🌍", "🌎", "🌏"];
const CLICKS = 5;
// Turning a globe is not a race: the clicks may be slow.
const CLICK_WINDOW_MS = 12_000;
const SPIN_FRAME_MS = 130;
const TURNS = 2;
const OUT_MS = 1100;
const BACK_MS = 1500;
const LIFT = 90;
const PAD = 24;
const OFFSCREEN = 50;

/** A strip as wide as the viewport around the globe. It clips the plane, so leaving the screen adds no scroll. */
type Flight = {
  left: number;
  top: number;
  width: number;
  height: number;
  out: string;
  back: string;
};

function planFlight(globe: Element): Flight {
  const g = pageBox(globe);
  const width = document.documentElement.clientWidth;
  const left = window.scrollX;
  const top = g.top + g.height / 2 - LIFT - PAD;
  const gx = Math.round(g.left + g.width / 2 - left);
  const gy = LIFT + PAD;
  const cruise = PAD;

  // Climb off the globe and leave on the right, then come in from the left and touch down level on the globe.
  const out = `M ${gx} ${gy} C ${Math.round(gx + (width - gx) * 0.35)} ${gy - LIFT} ${width - 40} ${cruise} ${width + OFFSCREEN} ${cruise}`;
  const back = `M ${-OFFSCREEN} ${cruise} C ${Math.round(gx * 0.45)} ${cruise} ${gx - Math.max(60, Math.round(gx * 0.4))} ${gy} ${gx} ${gy}`;
  return { left, top, width, height: LIFT + PAD * 2, out, back };
}

const TravelingEgg = () => {
  const reduceMotion = useReducedMotion();
  const { run, wait, busyRef } = useEggRunner();
  const globeRef = useRef<HTMLSpanElement>(null);
  const planeRef = useRef<HTMLSpanElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const [globe, setGlobe] = useState(GLOBES[0]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [landed, setLanded] = useState(false);

  // Plane and trail share duration and easing, so the dots appear right behind the plane.
  const fly = async (path: string, trail: string, duration: number, easing: string) => {
    const plane = planeRef.current;
    if (!plane) return;
    plane.style.offsetPath = `path("${path}")`;
    const timing = { duration, easing, fill: "forwards" } as const;
    layerRef.current
      ?.querySelector(`[data-trail="${trail}"]`)
      ?.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], timing);
    await plane
      .animate([{ offsetDistance: "0%" }, { offsetDistance: "100%" }], timing)
      .finished.catch(() => undefined);
  };

  // Each click turns the globe one step further; no need to hurry.
  const spinOne = () =>
    setGlobe((current) => GLOBES[(GLOBES.indexOf(current) + 1) % GLOBES.length]);

  const registerClick = useEasterEgg("traveling", {
    clicks: CLICKS,
    windowMs: CLICK_WINDOW_MS,
    onProgress: spinOne,
    onTrigger: () =>
      run(async () => {
        if (!globeRef.current) return;
        const plan = planFlight(globeRef.current);

        if (reduceMotion) {
          setFlight(plan);
          await wait(1500);
          setLanded(true);
          await wait(500);
          setFlight(null);
          setLanded(false);
          return;
        }

        for (let i = 0; i < GLOBES.length * TURNS; i++) {
          spinOne();
          await wait(SPIN_FRAME_MS);
        }
        setFlight(plan);
        await wait(30);
        await fly(plan.out, "out", OUT_MS, "ease-in");
        await wait(250);
        await fly(plan.back, "back", BACK_MS, "ease-out");

        // Touchdown: the plane fades out where it landed, and the globe bounces.
        planeRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: 450,
          easing: "ease-out",
          fill: "forwards",
        });
        globeRef.current?.animate([{ scale: 1 }, { scale: 1.25 }, { scale: 1 }], {
          duration: 350,
          easing: "ease-out",
        });
        setLanded(true);
        await wait(500);
        setFlight(null);
        setLanded(false);
        setGlobe(GLOBES[0]);
      }),
  });

  const gx = flight ? Number(flight.out.split(" ")[1]) : 0;

  return (
    <>
      Traveling Stories{" "}
      <EmojiButton
        label="Globe"
        nudge={false}
        onClick={() => {
          if (!busyRef.current) registerClick();
        }}
      >
        <span ref={globeRef} className="inline-block">
          {globe}
        </span>
      </EmojiButton>
      {flight && (
        <PageLayer>
          <div
            ref={layerRef}
            aria-hidden="true"
            className="absolute overflow-hidden text-base font-normal"
            style={{
              left: flight.left,
              top: flight.top,
              width: flight.width,
              height: flight.height,
            }}
          >
            {reduceMotion ? (
              <span
                className="absolute text-2xl leading-none transition-opacity duration-500"
                style={{ left: gx + 16, top: PAD + LIFT - 44, opacity: landed ? 0 : 1 }}
              >
                ✈️
              </span>
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  className="text-accent absolute inset-0 transition-opacity duration-500"
                  width={flight.width}
                  height={flight.height}
                  style={{ opacity: landed ? 0 : 0.8 }}
                >
                  {(["out", "back"] as const).map((leg) => (
                    <g key={leg}>
                      <mask id={`flight-trail-${leg}`}>
                        <path
                          data-trail={leg}
                          d={flight[leg]}
                          pathLength={1}
                          fill="none"
                          stroke="white"
                          strokeWidth={8}
                          strokeDasharray="1 1"
                          strokeDashoffset={1}
                        />
                      </mask>
                      <path
                        d={flight[leg]}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeDasharray="0.1 9"
                        mask={`url(#flight-trail-${leg})`}
                      />
                    </g>
                  ))}
                </svg>
                <span
                  ref={planeRef}
                  className="absolute top-0 left-0 text-2xl leading-none"
                  style={{
                    offsetPath: `path("${flight.out}")`,
                    offsetRotate: "auto 45deg",
                    offsetDistance: "0%",
                  }}
                >
                  ✈️
                </span>
              </>
            )}
          </div>
        </PageLayer>
      )}
    </>
  );
};

export default TravelingEgg;

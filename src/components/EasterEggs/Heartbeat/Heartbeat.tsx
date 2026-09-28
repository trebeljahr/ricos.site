import clsx from "clsx";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRecordEggFind } from "src/hooks/useEasterEgg";
import { BASELINE, MONITOR_HEIGHT, startMonitor } from "./monitor";

/** The pink of the fractal.garden heart. */
const HEART_PINK = "#e8839b";
const FADE_MS = 500;

type Shared = {
  on: boolean;
  setOn: (on: boolean) => void;
  canvas: HTMLCanvasElement | null;
  setCanvas: (canvas: HTMLCanvasElement | null) => void;
};

const HeartbeatContext = createContext<Shared | null>(null);

const useHeartbeat = () => {
  const shared = useContext(HeartbeatContext);
  if (!shared) throw new Error("The heart and its monitor need a HeartbeatProvider around them");
  return shared;
};

/** Lets the heart in the byline draw on the monitor along the footer's top edge. */
export const HeartbeatProvider = ({ children }: { children: ReactNode }) => {
  const [on, setOn] = useState(false);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const shared = useMemo(() => ({ on, setOn, canvas, setCanvas }), [on, canvas]);
  return <HeartbeatContext.Provider value={shared}>{children}</HeartbeatContext.Provider>;
};

/**
 * The strip the trace is drawn on. Its line sits on the footer's top border,
 * so the border itself is what starts to beat. Render it before anything
 * else perched on that border, so it paints underneath.
 */
export const HeartMonitor = () => {
  const { on, setCanvas } = useHeartbeat();
  if (!on) return null;
  return (
    <canvas
      ref={setCanvas}
      className="pointer-events-none absolute inset-x-0 w-full"
      style={{ top: -BASELINE - 1, height: MONITOR_HEIGHT }}
    />
  );
};

/**
 * Easter egg: the heart in the byline. Clicking it switches on a heart
 * monitor, and the footer's top border becomes the trace, beating in time
 * with the heart. Every click winds the rate up, and a click can force a beat
 * of its own if the heart is ready for one. Left alone, the heart calms back
 * down to rest, and a few seconds after that the monitor switches off.
 */
export const Heart = () => {
  const { on, setOn, canvas } = useHeartbeat();
  const recordFind = useRecordEggFind();
  const heartRef = useRef<SVGSVGElement>(null);
  const monitor = useRef<ReturnType<typeof startMonitor> | null>(null);
  /** Clicks that came in before the monitor was up to take them. */
  const waiting = useRef(0);
  const fading = useRef<Animation | null>(null);
  const found = useRef(false);

  useEffect(() => {
    if (!canvas) return;
    canvas.animate([{ opacity: 0 }, { opacity: 1 }], FADE_MS);

    const running = startMonitor(canvas, {
      color: HEART_PINK,
      calm: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      // Lub-dub, harder the faster it goes, and over before the next beat.
      onBeat: (effort, rr) => {
        const peak = 1.2 + 0.2 * effort;
        heartRef.current?.animate(
          [
            { transform: "scale(1)" },
            { transform: `scale(${peak})`, offset: 0.14 },
            { transform: "scale(1)", offset: 0.28 },
            { transform: `scale(${1 + (peak - 1) * 0.75})`, offset: 0.42 },
            { transform: "scale(1)", offset: 0.56 },
            { transform: "scale(1)" },
          ],
          { duration: Math.min(900, rr * 1000), easing: "ease-in-out" },
        );
      },
      onRest: () => {
        fading.current = canvas.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: FADE_MS,
          fill: "forwards",
        });
        // A click while it fades cancels the fade, and this never happens.
        fading.current.finished.then(() => setOn(false)).catch(() => undefined);
      },
    });
    monitor.current = running;
    for (; waiting.current > 0; waiting.current--) running.click();

    return () => {
      running.stop();
      monitor.current = null;
      fading.current = null;
    };
  }, [canvas, setOn]);

  const click = () => {
    if (!found.current) {
      found.current = true;
      recordFind("heartbeat");
    }
    fading.current?.cancel();
    fading.current = null;
    if (monitor.current) monitor.current.click();
    else {
      waiting.current += 1;
      setOn(true);
    }
  };

  // Plain inline text, not flex, so the byline copies as "Made with love by
  // …". The heart is aria-hidden and the sr-only "love" right after it is
  // what screen readers and the clipboard get, so keep it flush against
  // </svg>: a space before it garbles the copied spacing. Heart path matches
  // fractal.garden.
  return (
    <button
      type="button"
      // Stops a burst of clicks from selecting the byline.
      onMouseDown={(event) => event.preventDefault()}
      onClick={click}
      className="inline cursor-pointer touch-manipulation appearance-none rounded-sm border-0 bg-transparent p-0 font-[inherit] leading-[inherit] text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      <svg
        ref={heartRef}
        className={clsx(
          "inline-block size-3.5 align-[-0.15em] fill-current",
          // While the monitor is on, the monitor keeps the time.
          !on && "animate-heartbeat motion-reduce:animate-none",
        )}
        style={{ color: HEART_PINK }}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
      </svg>
      <span className="sr-only">love</span>
    </button>
  );
};

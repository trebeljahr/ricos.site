import clsx from "clsx";
import { useMemo, useState } from "react";
import {
  FRAME_MS,
  SCALE_SIZES,
  type ScaleSize,
  screenScaleRuns,
  ticksToMs,
} from "../../lib/computer/screenScale";
import { frameBytes, SCREEN_SIZES } from "../../lib/computer/video";
import { ScreenGrid } from "./ScreenGrid";

const buttonClass =
  "rounded border border-gray-300 px-3 py-1 text-sm font-medium text-gray-800 hover:border-cyan-500 hover:text-cyan-600 aria-pressed:border-cyan-500 aria-pressed:bg-cyan-50 aria-pressed:text-cyan-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300 dark:aria-pressed:bg-cyan-950 dark:aria-pressed:text-cyan-300";

const number = (value: number) => value.toLocaleString("en");
const ms = (ticks: number) => {
  const value = ticksToMs(ticks);
  return value < 1 ? `${value.toFixed(3)} ms` : `${number(Math.round(value * 10) / 10)} ms`;
};

/**
 * One job — light every pixel — done every way the toy computer offers, at
 * three screen sizes. One bar per method: its ticks to finish, on one scale
 * per size, with the CPU's share of them and the time at a 1 MHz clock.
 */
export function ScreenScaleDemo() {
  const [size, setSize] = useState<ScaleSize>("32×32");
  const runs = useMemo(() => screenScaleRuns(), []);
  const list = runs[size];
  const longest = Math.max(...list.map((run) => run.ticks));
  const screen = SCREEN_SIZES[size];
  const full = useMemo(() => Array(frameBytes(screen)).fill(255), [screen]);

  return (
    <section className="not-prose flow-para" aria-label="Screen size comparison">
      <fieldset
        className="m-0 flex flex-wrap items-center gap-tight border-0 p-0"
        aria-label="Screen size"
      >
        {SCALE_SIZES.map((name) => (
          <button
            key={name}
            type="button"
            className={buttonClass}
            aria-pressed={name === size}
            onClick={() => setSize(name)}
          >
            {name}
          </button>
        ))}
      </fieldset>

      <div className="mt-para flex flex-wrap items-start gap-para">
        <figure className="m-0">
          <ScreenGrid rows={full} size={screen} label={`${size} screen`} />
          <figcaption className="mt-tight text-xs text-gray-600 dark:text-gray-400">
            {number(screen.width * screen.height)} pixels, {number(frameBytes(screen))} bytes
          </figcaption>
        </figure>
      </div>

      <ol
        className="mt-para flex list-none flex-col gap-stack p-0"
        aria-label={`Ways to fill the ${size} screen`}
      >
        {list.map((run) => {
          const share = run.cpuTicks / run.ticks;
          return (
            <li key={run.method} className="m-0 p-0" data-method={run.method}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-stack">
                <strong className="text-sm text-gray-900 dark:text-gray-100">{run.method}</strong>
                <span className="text-xs text-gray-600 dark:text-gray-400">{run.source}</span>
              </div>
              <div
                className="mt-hair h-3 rounded-r bg-gray-100 dark:bg-gray-800"
                title={`${number(run.ticks)} ticks`}
              >
                <div
                  className="h-3 rounded-r bg-cyan-600 dark:bg-cyan-400"
                  style={{ width: `${Math.max(0.5, (run.ticks / longest) * 100)}%` }}
                />
              </div>
              <p className="m-0 mt-hair text-xs text-gray-700 dark:text-gray-300">
                <span className="font-semibold">{number(run.ticks)} ticks</span>
                {" · "}
                {ms(run.ticks)} at 1 MHz
                {" · "}
                {ticksToMs(run.ticks) > FRAME_MS
                  ? `${number(Math.round((ticksToMs(run.ticks) / FRAME_MS) * 10) / 10)} frames at 60 Hz`
                  : "within one 60 Hz frame"}
                {" · "}
                {run.cpuTicks === 0
                  ? "CPU free the whole time"
                  : share === 1
                    ? "CPU busy the whole time"
                    : `CPU busy for ${number(run.cpuTicks)} ticks (${share < 0.01 ? "under 1%" : `${Math.round(share * 100)}%`})`}
              </p>
              <details className="mt-hair text-xs text-gray-600 dark:text-gray-400">
                <summary className="cursor-pointer">{run.how}</summary>
                <pre
                  className={clsx(
                    "mt-hair overflow-x-auto rounded p-tight",
                    "bg-gray-50 dark:bg-gray-900",
                  )}
                >
                  {run.code}
                </pre>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

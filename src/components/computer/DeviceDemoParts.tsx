import clsx from "clsx";
import { type ReactNode, useEffect } from "react";

// Shared pieces of the hands-on device demos: one device of the toy machine,
// its registers set by hand, no CPU and no program.

export const buttonClass =
  "rounded border border-gray-300 px-3 py-1 text-sm font-medium text-gray-800 hover:border-cyan-500 hover:text-cyan-600 disabled:opacity-40 aria-pressed:border-cyan-500 aria-pressed:bg-cyan-50 aria-pressed:text-cyan-700 dark:border-gray-700 dark:text-gray-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300 dark:aria-pressed:bg-cyan-950 dark:aria-pressed:text-cyan-300";
export const captionClass = "text-sm font-semibold text-gray-800 dark:text-gray-200";
export const hintClass = "max-w-72 text-xs text-gray-600 dark:text-gray-400";
export const readoutClass = "font-mono text-sm text-gray-800 dark:text-gray-200";
export const noteClass = "text-sm text-gray-600 dark:text-gray-400";

/**
 * LED size of an 8×8 screen that is the subject of its demo. Put the class on
 * an ancestor of the ScreenGrid; `LED_PITCH` is then one LED and its 1px gutter.
 */
export const LED_SIZE_CLASS = "[--pixel-size:22px] sm:[--pixel-size:30px]";
export const LED_PITCH = "calc(var(--pixel-size) + 1px)";

/** Where a byte of the 32×32 screen is, 4 bytes to a row: "row 1, pixels 8 to 15". */
export const byteWhere = (byte: number) =>
  `row ${byte >> 2}, pixels ${(byte & 3) * 8} to ${(byte & 3) * 8 + 7}`;

/**
 * A layer of buttons over a ScreenGrid, one per cell. The grid's LEDs start
 * 6px in (its border and padding) and have 1px gutters; half a gutter further
 * out, `columns` equal cells of the layer line up with the LEDs under them.
 * Square cells size themselves; cells of another shape need `rows`.
 */
export function ClickLayer({
  columns,
  rows,
  children,
}: {
  columns: number;
  rows?: number;
  children: ReactNode;
}) {
  return (
    <div
      className="absolute inset-[5.5px] grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridTemplateRows: rows ? `repeat(${rows}, 1fr)` : undefined,
      }}
    >
      {children}
    </div>
  );
}

/** One line per screen row, `pitch` apart, so each line sits beside its row of LEDs. */
export function RowLines({
  label,
  pitch,
  children,
}: {
  label: string;
  pitch: string;
  children: ReactNode;
}) {
  return (
    <ol
      aria-label={label}
      className="m-0 grid list-none p-0 pt-[6px] font-mono text-xs text-gray-800 dark:text-gray-200"
      style={{ gridAutoRows: pitch }}
    >
      {children}
    </ol>
  );
}

/** A register set by hand: its name, a slider, and a readout of what the value means. */
export function Slider({
  name,
  label = `${name} register`,
  min = 0,
  max,
  value,
  onChange,
  children,
}: {
  name: string;
  /** The slider's accessible name. The readout's is `name`. */
  label?: string;
  min?: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-stack gap-y-hair">
      <span className="flex items-center gap-tight text-sm text-gray-800 dark:text-gray-200">
        <span className="w-20">{name}</span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
          className="w-40"
        />
      </span>
      {children !== undefined && (
        <output aria-label={name} className={readoutClass}>
          {children}
        </output>
      )}
    </div>
  );
}

/** The instruction the last action stands for. */
export function LastStore({ children }: { children: string }) {
  return (
    <p className={readoutClass}>
      Last store:{" "}
      <output aria-label="Last store" aria-live="polite">
        {children}
      </output>
    </p>
  );
}

/** Calls `tick` every `ms` while `playing`. Pass a `tick` that keeps its identity. */
export function useClock(playing: boolean, tick: () => void, ms: number) {
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(tick, ms);
    return () => clearInterval(timer);
  }, [playing, tick, ms]);
}

/** Step, play and reset for a device that works one clock tick at a time. */
export function ClockControls({
  playing,
  onStep,
  onPlay,
  onReset,
}: {
  playing: boolean;
  onStep: () => void;
  onPlay: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-tight">
      <button type="button" className={buttonClass} disabled={playing} onClick={onStep}>
        Step 1 tick
      </button>
      <button type="button" className={buttonClass} onClick={onPlay}>
        {playing ? "Pause the clock" : "Run the clock"}
      </button>
      <button type="button" className={buttonClass} onClick={onReset}>
        Reset
      </button>
    </div>
  );
}

/**
 * A blitter beside the CPU: what the blitter does on this tick, its BUSY bit,
 * and a counter that adds 1 on every tick for the CPU's own program.
 */
export function BlitterStatus({
  name,
  status,
  busy,
  ticks,
}: {
  name: string;
  status: string;
  busy: boolean;
  ticks: number;
}) {
  return (
    <dl
      className={clsx(
        "m-0 grid grid-cols-[auto_1fr] items-center gap-x-stack gap-y-hair",
        readoutClass,
      )}
    >
      <dt>{name}</dt>
      <dd className="m-0">
        <output aria-label={name}>{status}</output>
      </dd>
      <dt>BUSY</dt>
      <dd className="m-0 flex items-center gap-tight">
        <span
          aria-hidden="true"
          className={clsx(
            "inline-block size-2.5 rounded-full",
            busy ? "bg-amber-400" : "bg-gray-300 dark:bg-gray-700",
          )}
        />
        <output aria-label="BUSY">{Number(busy)}</output>
      </dd>
      <dt>CPU counter</dt>
      <dd className="m-0">
        <output aria-label="CPU counter">{ticks}</output>
      </dd>
    </dl>
  );
}

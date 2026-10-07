import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import { FRAME_TICKS, scanoutTrace } from "../../lib/computer/video";
import { compileProgram, hex, traceTicks, VIDEO_SAMPLES } from "../../lib/computerStepper";
import { ScreenGrid } from "./ScreenGrid";

type Sample = keyof typeof VIDEO_SAMPLES;

const SAMPLES: Record<Sample, { title: string; text: string }> = {
  TEARING: {
    title: "Tearing",
    text: "The CPU redraws whenever its loop gets there. A redraw lands anywhere in a frame, so the beam paints the top of one picture and the bottom of the other.",
  },
  VSYNC: {
    title: "Wait for VBLANK",
    text: "Before each redraw, wait_vblank() polls LDM FB until the beam reaches the blank lines. The redraw starts while the beam is off the screen and stays ahead of it, so each frame is one whole picture.",
  },
};

const buttonClass =
  "rounded border border-gray-300 px-3 py-1 text-sm font-medium text-gray-800 hover:border-cyan-500 hover:text-cyan-600 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:border-cyan-400 dark:hover:text-cyan-300";

/**
 * The toy CPU redrawing the screen while a scanout reads it one pixel per
 * tick. Left: the framebuffer the CPU writes. Right: the monitor, which only
 * changes where the beam passes.
 */
export function ScanoutDemo() {
  const [sample, setSample] = useState<Sample>("TEARING");
  const [tick, setTick] = useState(FRAME_TICKS * 2);
  const [playing, setPlaying] = useState(false);
  const { program, ticks, frames } = useMemo(() => {
    const program = compileProgram(VIDEO_SAMPLES[sample]);
    const ticks = traceTicks(program);
    return { program, ticks, frames: scanoutTrace(ticks.map((t) => t.screen)) };
  }, [sample]);
  const last = ticks.length - 1;
  const at = Math.min(tick, last);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setTick((current) => {
        if (current >= last) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 25);
    return () => clearInterval(timer);
  }, [playing, last]);

  const now = ticks[at];
  const frame = frames[at];
  const instruction = program.instructions.find((item) => item.address === now.address);
  const write = now.screenWrite;

  return (
    <section className="not-prose flow-para" aria-label="Scanout demo">
      <fieldset className="flex flex-wrap gap-tight">
        <legend className="sr-only">Program</legend>
        {(Object.keys(SAMPLES) as Sample[]).map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={sample === name}
            className={clsx(buttonClass, sample === name && "border-cyan-500 text-cyan-600")}
            onClick={() => setSample(name)}
          >
            {SAMPLES[name].title}
          </button>
        ))}
      </fieldset>
      <p className="text-gray-700 dark:text-gray-300">{SAMPLES[sample].text}</p>

      <div className="flex flex-wrap items-start gap-group">
        <figure className="flow-label">
          <figcaption className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Framebuffer (what the CPU wrote)
          </figcaption>
          <ScreenGrid
            rows={now.screen}
            label="Framebuffer"
            written={write}
            className="[--pixel-size:22px]"
          />
        </figure>
        <figure className="flow-label">
          <figcaption className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Monitor (what the beam painted)
          </figcaption>
          <ScreenGrid
            rows={frame.image}
            label="Monitor"
            beam={frame.next.vblank ? null : { x: frame.next.x, y: frame.next.y }}
            className="[--pixel-size:22px]"
          />
        </figure>
        <dl className="grid grid-cols-[auto_auto] gap-x-stack gap-y-hair font-mono text-sm text-gray-800 dark:text-gray-200">
          <dt>Tick</dt>
          <dd>{at}</dd>
          <dt>Frame</dt>
          <dd>{Math.floor((at + 1) / FRAME_TICKS)}</dd>
          <dt>Beam</dt>
          <dd>
            <output aria-label="Beam">
              {frame.next.vblank
                ? `VBLANK (line ${frame.next.y})`
                : `x ${frame.next.x}, y ${frame.next.y}`}
            </output>
          </dd>
          <dt>CPU</dt>
          <dd>
            {hex(now.address)} {instruction?.label ?? ""}
          </dd>
        </dl>
      </div>

      <div className="flex flex-wrap items-center gap-tight">
        <button type="button" className={buttonClass} onClick={() => setPlaying(!playing)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={at === 0}
          onClick={() => setTick(Math.max(0, at - 1))}
        >
          Back 1 tick
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={at === last}
          onClick={() => setTick(Math.min(last, at + 1))}
        >
          Step 1 tick
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={at === last}
          onClick={() => setTick(Math.min(last, at + FRAME_TICKS))}
        >
          Step 1 frame
        </button>
        <input
          type="range"
          aria-label="Scrub ticks"
          min={0}
          max={last}
          value={at}
          onChange={(event) => setTick(Number(event.target.value))}
          className="min-w-48 flex-1"
        />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        The beam reads one pixel per clock tick: 8 visible lines of 8 pixels, then 8 blank lines
        while it returns to the top. The framebuffer is dual-ported, so the CPU writes through one
        port while the beam reads through the other and neither waits. A single-port framebuffer
        needs arbitration instead: the beam wins every tick, and the CPU stalls until it gets a
        turn.
      </p>
      <pre className="overflow-x-auto rounded bg-gray-100 p-stack text-xs dark:bg-gray-900">
        {VIDEO_SAMPLES[sample]}
      </pre>
    </section>
  );
}

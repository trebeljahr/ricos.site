import clsx from "clsx";
import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { type Mat, rowsOf } from "src/lib/computer/graphics/matrix";
import type { Framebuffer } from "src/lib/computer/graphics/rasterizer";
import styles from "./Graphics.module.css";

/** A fixed width, no minus zero. */
export function fixed(value: number, digits = 2) {
  const text = value.toFixed(digits);
  return Number(text) === 0 ? (0).toFixed(digits) : text;
}

/** The panel, screws and nameplate every 3D demo sits in. */
export function GraphicsPanel({
  title,
  sound,
  children,
}: {
  title: string;
  sound: { soundEnabled: boolean; toggleSound: () => void };
  children: ReactNode;
}) {
  return (
    <section className={clsx("not-prose", styles.panel)} aria-label={title}>
      <div className={styles.nameplate}>
        <strong>{title}</strong>
        <button
          type="button"
          className={styles.soundButton}
          onClick={sound.toggleSound}
          aria-pressed={sound.soundEnabled}
          aria-label={`Sound ${sound.soundEnabled ? "on" : "off"}. Toggle sound.`}
        >
          <i aria-hidden="true" /> SOUND {sound.soundEnabled ? "ON" : "OFF"}
        </button>
      </div>
      <div className={styles.deck}>{children}</div>
    </section>
  );
}

export function Bay({
  head,
  aside,
  children,
}: {
  head?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.bay}>
      {head && (
        <div className={styles.sectionHead}>
          <span>{head}</span>
          {aside !== undefined && <span>{aside}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format = (v) => fixed(v),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className={styles.slider}>
      <span>{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        style={{ "--fill": `${((value - min) / (max - min || 1)) * 100}%` } as CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className={styles.sliderValue}>{format(value)}</span>
    </label>
  );
}

/** A row of mutually exclusive buttons. */
export function Choice<Value extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Value;
  options: readonly { value: Value; label: string; disabled?: boolean }[];
  onChange: (value: Value) => void;
}) {
  return (
    <fieldset className={styles.choice}>
      <legend>{label}</legend>
      <div className={styles.choiceRow}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.button}
            aria-pressed={option.value === value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Toggle({
  label,
  on,
  disabled,
  onChange,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={styles.button}
      aria-pressed={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
    >
      {label}
    </button>
  );
}

const AXIS_BY_COLUMN = ["x", "y", "z", "t"];

/** Prints a matrix. With `axes`, each column takes the colour of the axis it holds. */
export function MatrixGrid({
  matrix,
  label,
  axes = false,
  small = false,
  digits = 2,
}: {
  matrix: Mat;
  label?: string;
  axes?: boolean;
  small?: boolean;
  digits?: number;
}) {
  const rows = rowsOf(matrix);
  const n = rows.length;
  const grid = (
    <table className="contents">
      <tbody className="contents">
        {rows.map((row, r) => (
          <tr key={r} className="contents">
            {row.map((value, c) => {
              // The last row of an affine matrix never changes, and the last column moves things.
              const lastRow = r === n - 1;
              const axis = !axes || lastRow ? undefined : c === n - 1 ? "t" : AXIS_BY_COLUMN[c];
              return (
                <td key={c} data-axis={axis} data-faint={axes && lastRow ? "" : undefined}>
                  {fixed(value, digits)}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
  const box = (
    <div
      className={clsx(styles.matrix, small && styles.matrixSmall)}
      style={{ gridTemplateColumns: `repeat(${n}, auto)` }}
    >
      {grid}
    </div>
  );
  if (!label) return box;
  return (
    <div className={styles.equationLabel}>
      {box}
      <span>{label}</span>
    </div>
  );
}

/** A column vector, drawn as a one-column matrix. */
export function VectorColumn({
  values,
  label,
  digits = 2,
}: {
  values: readonly number[];
  label?: string;
  digits?: number;
}) {
  const box = (
    <div className={styles.matrix} style={{ gridTemplateColumns: "auto" }}>
      {values.map((value, i) => (
        <span key={i}>{fixed(value, digits)}</span>
      ))}
    </div>
  );
  if (!label) return box;
  return (
    <div className={styles.equationLabel}>
      {box}
      <span>{label}</span>
    </div>
  );
}

const hasCanvas = (canvas: HTMLCanvasElement) => {
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
};

/**
 * A canvas sized to its box and the screen's pixel density. `onDrag` and `onTap`
 * get CSS pixels; a press that barely moves is a tap. Vertical swipes stay with
 * the page, so a phone can scroll past it.
 */
export function SceneCanvas({
  draw,
  label,
  aspect = 4 / 3,
  onDrag,
  onTap,
}: {
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  label: string;
  aspect?: number;
  onDrag?: (dx: number, dy: number) => void;
  onTap?: (x: number, y: number, width: number, height: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const measure = () => setWidth(element.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Without a dependency list on purpose: draw closes over the demo's state.
  useEffect(() => {
    const element = canvas.current;
    const context = element && hasCanvas(element);
    if (!element || !context) return;
    const cssWidth = width || 480;
    const cssHeight = cssWidth / aspect;
    const density = Math.min(2, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(cssWidth * density);
    const pixelHeight = Math.round(cssHeight * density);
    if (element.width !== pixelWidth) element.width = pixelWidth;
    if (element.height !== pixelHeight) element.height = pixelHeight;
    context.setTransform(density, 0, 0, density, 0, 0);
    draw(context, cssWidth, cssHeight);
  });

  const down = (event: PointerEvent<HTMLCanvasElement>) => {
    press.current = { x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    const held = press.current;
    if (!held) return;
    const dx = event.clientX - held.x;
    const dy = event.clientY - held.y;
    if (!held.moved && Math.hypot(dx, dy) < 4) return;
    held.moved = true;
    held.x = event.clientX;
    held.y = event.clientY;
    onDrag?.(dx, dy);
  };
  const up = (event: PointerEvent<HTMLCanvasElement>) => {
    const held = press.current;
    press.current = null;
    if (!held || held.moved) return;
    const box = event.currentTarget.getBoundingClientRect();
    onTap?.(event.clientX - box.left, event.clientY - box.top, box.width, box.height);
  };
  const key = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const step = {
      ArrowLeft: [-12, 0],
      ArrowRight: [12, 0],
      ArrowUp: [0, -12],
      ArrowDown: [0, 12],
    }[event.key];
    if (!step || !onDrag) return;
    event.preventDefault();
    onDrag(step[0], step[1]);
  };

  return (
    <canvas
      ref={canvas}
      className={styles.canvas}
      style={{ aspectRatio: String(aspect) }}
      role="img"
      aria-label={label}
      tabIndex={onDrag ? 0 : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        press.current = null;
      }}
      onKeyDown={key}
    />
  );
}

/** Copies a framebuffer's pixels to a canvas one to one. CSS scales them up without smoothing. */
export function paintFramebuffer(canvas: HTMLCanvasElement | null, framebuffer: Framebuffer) {
  const context = canvas && hasCanvas(canvas);
  if (!canvas || !context) return;
  if (canvas.width !== framebuffer.width) canvas.width = framebuffer.width;
  if (canvas.height !== framebuffer.height) canvas.height = framebuffer.height;
  const image = context.createImageData(framebuffer.width, framebuffer.height);
  image.data.set(framebuffer.color);
  context.putImageData(image, 0, 0);
}

/** Runs a callback once a frame while `running`, with seconds since the last frame. */
export function useAnimation(running: boolean, step: (seconds: number) => void) {
  const latest = useRef(step);
  latest.current = step;
  useEffect(() => {
    if (!running || typeof requestAnimationFrame === "undefined") return;
    let previous = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const seconds = Math.min(0.1, (now - previous) / 1000);
      previous = now;
      latest.current(seconds);
      id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [running]);
}

export const prefersStillness = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Eases a number towards a target. Without animation frames, or for readers who ask for less motion, it jumps. */
export function useEased(target: number, secondsPerUnit = 0.9) {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    if (current.current === target) return;
    if (typeof requestAnimationFrame === "undefined" || prefersStillness()) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const duration = Math.min(1600, Math.abs(target - from) * secondsPerUnit * 1000);
    const start = performance.now();
    let id = requestAnimationFrame(function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      current.current = from + (target - from) * eased;
      setValue(current.current);
      if (t < 1) id = requestAnimationFrame(frame);
    });
    return () => cancelAnimationFrame(id);
  }, [target, secondsPerUnit]);
  return value;
}

/** A position from 0 to 1 that a button plays over some seconds and a slider can scrub. Opens finished. */
export function useTimeline(seconds: number, start = 1) {
  const [t, setT] = useState(start);
  const [playing, setPlaying] = useState(false);
  useAnimation(playing, (elapsed) => {
    const next = t + elapsed / seconds;
    if (next >= 1) {
      setT(1);
      setPlaying(false);
    } else {
      setT(next);
    }
  });
  return {
    t,
    playing,
    play: () => {
      if (playing) {
        setPlaying(false);
        return;
      }
      if (t >= 1) setT(0);
      setPlaying(true);
    },
    seek: (value: number) => {
      setT(value);
      setPlaying(false);
    },
  };
}

export type Timeline = ReturnType<typeof useTimeline>;

/** A play button and the slider that scrubs the same animation. */
export function PlayBar({
  button,
  label,
  timeline,
  format,
}: {
  button: string;
  label: string;
  timeline: Timeline;
  format?: (t: number) => string;
}) {
  return (
    <div className={styles.choiceRow} style={{ alignItems: "center" }}>
      <button
        type="button"
        className={styles.button}
        aria-pressed={timeline.playing}
        onClick={timeline.play}
      >
        {timeline.playing ? "PAUSE" : button}
      </button>
      <div style={{ flex: "1 1 180px", minWidth: 0 }}>
        <Slider
          label={label}
          value={timeline.t}
          min={0}
          max={1}
          step={0.001}
          format={format ?? ((t) => `${Math.round(t * 100)}%`)}
          onChange={timeline.seek}
        />
      </div>
    </div>
  );
}

/**
 * A matrix times a vector, written as what it does: each number of the vector
 * scales one column of the matrix, and the scaled columns add up.
 */
export function ColumnSum({
  matrix,
  vector,
  result,
  active,
  digits = 2,
}: {
  matrix: Mat;
  vector: readonly number[];
  result: readonly number[];
  /** Which column the animation is adding right now. */
  active?: number | null;
  digits?: number;
}) {
  const rows = rowsOf(matrix);
  const n = rows.length;
  return (
    <div className={styles.equation}>
      {rows[0].map((_, column) => {
        const axis = column === n - 1 ? "t" : AXIS_BY_COLUMN[column];
        return (
          <span key={axis} className={styles.equation}>
            {column > 0 && <span>+</span>}
            <span className={styles.term} data-active={active === column ? "" : undefined}>
              <b data-axis={axis}>{fixed(vector[column], digits)}</b>
              <span>×</span>
              <span className={styles.matrix} style={{ gridTemplateColumns: "auto" }}>
                {rows.map((row, r) => (
                  <span
                    key={r}
                    data-axis={r === n - 1 ? undefined : axis}
                    data-faint={r === n - 1 ? "" : undefined}
                  >
                    {fixed(row[column], digits)}
                  </span>
                ))}
              </span>
            </span>
          </span>
        );
      })}
      <span>=</span>
      <span className={styles.matrix} style={{ gridTemplateColumns: "auto" }}>
        {result.map((value, r) => (
          <span key={r} data-faint={r === n - 1 ? "" : undefined}>
            {fixed(value, digits)}
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * A framebuffer on screen, with whatever is drawn over it. Dragging turns the
 * view unless `stroke` is set, which hands over pointer positions in pixels of
 * the framebuffer instead. A press that barely moves is a tap.
 */
export function PixelCanvas({
  framebuffer,
  label,
  blocky = true,
  stroke,
  onDrag,
  onTap,
  children,
}: {
  framebuffer: Framebuffer;
  label: string;
  blocky?: boolean;
  stroke?: (x: number, y: number, first: boolean) => void;
  onDrag?: (dx: number, dy: number) => void;
  onTap?: (x: number, y: number) => void;
  children?: ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  useEffect(() => {
    paintFramebuffer(canvas.current, framebuffer);
  });
  const toPixels = (event: PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return [
      Math.floor(((event.clientX - box.left) / box.width) * framebuffer.width),
      Math.floor(((event.clientY - box.top) / box.height) * framebuffer.height),
    ] as const;
  };
  return (
    <div className={styles.screen}>
      <canvas
        ref={canvas}
        width={framebuffer.width}
        height={framebuffer.height}
        className={clsx(styles.canvas, blocky && styles.pixels)}
        style={{
          aspectRatio: `${framebuffer.width} / ${framebuffer.height}`,
          touchAction: stroke ? "none" : undefined,
          cursor: stroke ? "crosshair" : undefined,
        }}
        role="img"
        aria-label={label}
        onPointerDown={(event) => {
          press.current = { x: event.clientX, y: event.clientY, moved: false };
          event.currentTarget.setPointerCapture?.(event.pointerId);
          if (stroke) {
            const [x, y] = toPixels(event);
            stroke(x, y, true);
          }
        }}
        onPointerMove={(event) => {
          const held = press.current;
          if (!held) return;
          if (stroke) {
            const [x, y] = toPixels(event);
            stroke(x, y, false);
            return;
          }
          const dx = event.clientX - held.x;
          const dy = event.clientY - held.y;
          if (!held.moved && Math.hypot(dx, dy) < 4) return;
          held.moved = true;
          held.x = event.clientX;
          held.y = event.clientY;
          onDrag?.(dx, dy);
        }}
        onPointerUp={(event) => {
          const held = press.current;
          press.current = null;
          if (held && !held.moved && !stroke) {
            const [x, y] = toPixels(event);
            onTap?.(x, y);
          }
        }}
        onPointerCancel={() => {
          press.current = null;
        }}
      />
      {children}
    </div>
  );
}

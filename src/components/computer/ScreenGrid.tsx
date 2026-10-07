import clsx from "clsx";
import { useEffect, useRef } from "react";
import {
  litPixels,
  pixelAt,
  rowBytes,
  SCREEN_8X8,
  type ScreenSize,
} from "../../lib/computer/video";
import styles from "./ScreenGrid.module.css";

const hex = (value: number) => value.toString(16).toUpperCase().padStart(2, "0");
/** Up to this width every pixel is its own element; wider screens draw on a canvas. */
const MAX_ELEMENT_WIDTH = 32;
/** Bigger grids get smaller pixels: about 128px across, 2px pixels at least. */
const pixelSize = (width: number) => Math.max(2, Math.floor(128 / width) - 1);

/**
 * An LED grid drawn from a screen's frame bytes: row y's byte c is at
 * y * width / 8 + c, and bit i of it is the pixel at x = 8c + i, so bit 0 of
 * a row's first byte is the left column. On the 8×8 screen that is one byte
 * per row. `written` rings the pixel (or, with x null, the whole row) the
 * last write changed. `beam` marks where a monitor's beam paints next; null
 * when it is in vertical blank.
 */
export function ScreenGrid({
  rows,
  label,
  className,
  written = null,
  beam,
  size = SCREEN_8X8,
}: {
  rows: readonly number[];
  label: string;
  className?: string;
  written?: { x: number | null; y: number } | null;
  beam?: { x: number; y: number } | null;
  size?: ScreenSize;
}) {
  const where =
    beam === undefined ? "" : beam ? `, beam at ${beam.x}, ${beam.y}` : ", beam in vertical blank";
  const small = size.width === 8 && size.height === 8;
  const name = small
    ? `${label} rows ${Array.from({ length: 8 }, (_, y) => hex(rows[y] ?? 0)).join(" ")}`
    : `${label} ${size.width}×${size.height}, ${litPixels(rows)} of ${size.width * size.height} pixels lit`;
  if (size.width > MAX_ELEMENT_WIDTH)
    return <ScreenCanvas rows={rows} size={size} label={`${name}${where}`} className={className} />;
  const xs = Array.from({ length: size.width }, (_, i) => i);
  const ys = Array.from({ length: size.height }, (_, i) => i);
  return (
    <div
      className={clsx(styles.grid, className)}
      role="img"
      aria-label={`${name}${where}`}
      style={
        small
          ? undefined
          : ({
              "--screen-columns": size.width,
              "--pixel-size": `${pixelSize(size.width)}px`,
            } as React.CSSProperties)
      }
    >
      {ys.flatMap((y) =>
        xs.map((x) => {
          const lit = pixelAt(rows, size, x, y);
          const fresh = written !== null && written.y === y && (written.x ?? x) === x;
          const under = Boolean(beam && beam.x === x && beam.y === y);
          return (
            <span
              key={`${x}-${y}`}
              className={clsx(
                styles.pixel,
                lit && styles.lit,
                fresh && styles.written,
                under && styles.beam,
              )}
              data-x={x}
              data-y={y}
              data-lit={lit}
              data-written={fresh || undefined}
              data-beam={under || undefined}
            />
          );
        }),
      )}
    </div>
  );
}

/** A big screen as one canvas pixel per screen pixel, scaled up by CSS. */
function ScreenCanvas({
  rows,
  size,
  label,
  className,
}: {
  rows: readonly number[];
  size: ScreenSize;
  label: string;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (!context) return;
    const style = getComputedStyle(canvas.current!);
    const on = style.getPropertyValue("--pixel-on").trim() || "#ff4d4d";
    const off = style.getPropertyValue("--pixel-off").trim() || "#2a1620";
    context.fillStyle = off;
    context.fillRect(0, 0, size.width, size.height);
    context.fillStyle = on;
    const stride = rowBytes(size);
    for (let y = 0; y < size.height; y++)
      for (let c = 0; c < stride; c++) {
        const byte = rows[y * stride + c] ?? 0;
        if (!byte) continue;
        for (let bit = 0; bit < 8; bit++)
          if ((byte >> bit) & 1) context.fillRect(c * 8 + bit, y, 1, 1);
      }
  }, [rows, size]);
  return (
    <canvas
      ref={canvas}
      width={size.width}
      height={size.height}
      className={clsx(styles.grid, styles.canvas, className)}
      role="img"
      aria-label={label}
    />
  );
}

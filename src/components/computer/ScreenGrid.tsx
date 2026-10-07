import clsx from "clsx";
import styles from "./ScreenGrid.module.css";

const PIXELS = Array.from({ length: 8 }, (_, i) => i);
const hex = (value: number) => value.toString(16).toUpperCase().padStart(2, "0");

/**
 * An 8×8 LED grid drawn from the screen's row bytes: row index = y, bit i of a
 * row = the pixel at x = i, so bit 0 is the left column. `written` rings the
 * pixel (or, with x null, the whole row) the last write changed.
 */
export function ScreenGrid({
  rows,
  label,
  className,
  written = null,
}: {
  rows: readonly number[];
  label: string;
  className?: string;
  written?: { x: number | null; y: number } | null;
}) {
  return (
    <div
      className={clsx(styles.grid, className)}
      role="img"
      aria-label={`${label} rows ${PIXELS.map((y) => hex(rows[y] ?? 0)).join(" ")}`}
    >
      {PIXELS.flatMap((y) =>
        PIXELS.map((x) => {
          const lit = Boolean(((rows[y] ?? 0) >> x) & 1);
          const fresh = written !== null && written.y === y && (written.x ?? x) === x;
          return (
            <span
              key={`${x}-${y}`}
              className={clsx(styles.pixel, lit && styles.lit, fresh && styles.written)}
              data-x={x}
              data-y={y}
              data-lit={lit}
              data-written={fresh || undefined}
            />
          );
        }),
      )}
    </div>
  );
}

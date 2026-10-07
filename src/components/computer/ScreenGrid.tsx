import clsx from "clsx";
import styles from "./ScreenGrid.module.css";

const PIXELS = Array.from({ length: 8 }, (_, i) => i);
const hex = (value: number) => value.toString(16).toUpperCase().padStart(2, "0");

/**
 * An 8×8 LED grid drawn from the screen's row bytes: row index = y, bit i of a
 * row = the pixel at x = i, so bit 0 is the left column.
 */
export function ScreenGrid({
  rows,
  label,
  className,
}: {
  rows: readonly number[];
  label: string;
  className?: string;
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
          return (
            <span
              key={`${x}-${y}`}
              className={clsx(styles.pixel, lit && styles.lit)}
              data-x={x}
              data-y={y}
              data-lit={lit}
            />
          );
        }),
      )}
    </div>
  );
}

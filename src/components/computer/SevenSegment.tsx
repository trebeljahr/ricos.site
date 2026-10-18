import { PLACES, SEGMENTS } from "../../lib/computer/sevenSegment";
import styles from "./LogicBuilder.module.css";
const BARS = [
  [18, 5, 48, 9],
  [67, 17, 9, 48],
  [67, 76, 9, 48],
  [18, 127, 48, 9],
  [7, 76, 9, 48],
  [7, 17, 9, 48],
  [18, 66, 48, 9],
];
/** Each SVG bar reads exactly one input. There is no numeric decoding here. */
export function SevenSegment({
  bits,
  digits = 1,
  label = "Seven segments",
  bank,
  onBank,
  raw = false,
}: {
  raw?: boolean;
  bits: readonly boolean[];
  digits?: number;
  label?: string;
  bank?: number;
  onBank?: (bank: number) => void;
}) {
  return (
    <div className={styles.segmentPanel}>
      {digits > 1 && onBank && (
        <fieldset className={styles.segmentBanks} aria-label="Exposed segment pins">
          {Array.from({ length: digits }, (_, d) => (
            <button
              type="button"
              key={PLACES[d]}
              aria-pressed={bank === d}
              onClick={() => onBank(d)}
            >
              {PLACES[d]} a–g
            </button>
          ))}
        </fieldset>
      )}
      <fieldset className={styles.segmentDisplay} aria-label={`${label} active-high segments`}>
        {Array.from({ length: digits }, (_, index) => digits - index - 1).map((digit) => (
          <div key={digit} className={styles.segmentDigit}>
            <svg
              viewBox="0 0 84 146"
              role="img"
              aria-label={`${raw && digits === 1 ? "Raw" : PLACES[digit]} segment map`}
            >
              {BARS.map(([x, y, width, height], i) => (
                <g
                  key={SEGMENTS[i]}
                  data-segment={`${digit}:${SEGMENTS[i]}`}
                  data-on={Boolean(bits[digit * 7 + i])}
                >
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx="3"
                    fill={bits[digit * 7 + i] ? "#ff746b" : "#442b3d"}
                  />
                  <text
                    x={x + width / 2}
                    y={y + height / 2 + 3}
                    textAnchor="middle"
                    fill={bits[digit * 7 + i] ? "#231522" : "#c5a8b8"}
                    fontSize="8"
                    fontWeight="bold"
                  >
                    {SEGMENTS[i]}
                  </text>
                </g>
              ))}
            </svg>
            <small>
              {raw && digits === 1 ? (
                "bars a–g"
              ) : (
                <>
                  {PLACES[digit]}
                  <br />×{10 ** digit}
                </>
              )}
            </small>
          </div>
        ))}
      </fieldset>
    </div>
  );
}

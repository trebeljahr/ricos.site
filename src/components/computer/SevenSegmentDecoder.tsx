import type { KeyboardEvent, ReactNode } from "react";
import { useState } from "react";
import {
  DIGITS,
  decodedBars,
  digitInputs,
  digitLines,
  railHigh,
  WEIGHTS,
} from "src/lib/computer/segmentDecoder";
import { SEGMENT_BARS, SEGMENTS, segmentBits } from "src/lib/computer/segmentNames";
import styles from "./SevenSegmentDecoder.module.css";

const WIDTH = 324;
const HEIGHT = 362;
// The rails of the AND plane: each bit, then its inverse beside it.
const railX = (index: number, inverted: boolean) => 36 + index * 34 + (inverted ? 16 : 0);
const SWITCH_Y = 64;
const SWITCH_SIZE = 26;
const SPLIT_Y = 96;
const NOT_Y = 103;
const RAIL_TOP = 118;
// One line per digit, running through both planes.
const rowY = (digit: number) => 172 + digit * 20;
const RAIL_BOTTOM = rowY(9) + 4;
const AND_X = 164;
const AND_WIDTH = 22;
// The OR plane. The bars' wires never cross when the columns run in this order.
const COLUMNS = ["a", "f", "g", "e", "d", "c", "b"] as const;
const columnX = (column: number) => 206 + column * 17;
const OR_TOP = 140;
const OR_BOTTOM = 157;
const FAN_BOTTOM = 138;
const FAN_TOP = 122;
// The display, with its bottom bar straight above column d.
const BAR_SCALE = 0.72;
const DISPLAY_X = columnX(COLUMNS.indexOf("d")) - 42 * BAR_SCALE;
const DISPLAY_Y = 12;
const lights = (digit: number, column: number) =>
  segmentBits(digit)[SEGMENTS.indexOf(COLUMNS[column])];
const barAt = (x: number, y: number) =>
  [DISPLAY_X + x * BAR_SCALE, DISPLAY_Y + y * BAR_SCALE] as const;
const TRACK: Partial<Record<(typeof SEGMENTS)[number], number>> = {
  a: DISPLAY_X - 13,
  f: DISPLAY_X - 8,
  g: DISPLAY_X - 3,
  e: DISPLAY_X + 2,
  c: DISPLAY_X + 60,
  b: DISPLAY_X + 65,
};

/** The wire from an OR gate's output to its bar: fan in, go up its track, enter the bar. */
function barWire(column: number) {
  const name = COLUMNS[column];
  const x = columnX(column);
  const track = TRACK[name];
  const [barX, barY, barW, barH] = SEGMENT_BARS[SEGMENTS.indexOf(name)];
  if (track === undefined) return `M${x} ${OR_TOP}V${barAt(barX, barY + barH)[1]}`;
  const fromRight = track > DISPLAY_X + 42 * BAR_SCALE;
  const [entryX, entryY] = barAt(fromRight ? barX + barW : barX, barY + barH / 2);
  return `M${x} ${OR_TOP}V${FAN_BOTTOM}L${track} ${FAN_TOP}V${entryY}H${entryX}`;
}

const notGate = (x: number) => `M${x - 5} ${NOT_Y}H${x + 5}L${x} ${NOT_Y + 10}Z`;
const andGate = (y: number) =>
  `M${AND_X} ${y - 7}H${AND_X + AND_WIDTH - 7}A7 7 0 0 1 ${AND_X + AND_WIDTH - 7} ${y + 7}H${AND_X}Z`;
const orGate = (x: number) =>
  `M${x - 7} ${OR_BOTTOM}Q${x} ${OR_BOTTOM - 4} ${x + 7} ${OR_BOTTOM}C${x + 7} ${OR_BOTTOM - 8} ${x + 3} ${OR_TOP + 3} ${x} ${OR_TOP}C${x - 3} ${OR_TOP + 3} ${x - 7} ${OR_BOTTOM - 8} ${x - 7} ${OR_BOTTOM}Z`;

/** A control drawn among the wires it drives. */
function Control({
  label,
  pressed,
  onPress,
  children,
}: {
  label: string;
  pressed: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  function onKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onPress();
  }
  return (
    // biome-ignore lint/a11y/useSemanticElements: A native HTML button cannot sit among these SVG wires.
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={pressed}
      className={styles.control}
      onClick={onPress}
      onKeyDown={onKeyDown}
    >
      {children}
    </g>
  );
}

/**
 * Four bits decoded into a digit, with every wire in view: one AND per digit,
 * one OR per bar. Usable in MDX articles.
 */
export function SevenSegmentDecoder() {
  const [number, setNumber] = useState(5);
  const lines = digitLines(number);
  const bars = decodedBars(number);
  const binary = number.toString(2).padStart(4, "0");

  return (
    <section className={`not-prose ${styles.demo}`} aria-label="Binary to seven-segment decoder">
      {/* biome-ignore lint/a11y/useSemanticElements: The SVG group holds the illustrated controls. */}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="group" aria-label="Decoder wiring">
        <text x={(railX(0, false) + railX(3, true)) / 2} y={38} className={styles.reading}>
          {binary} = <tspan>{number}</tspan>
        </text>

        {WEIGHTS.map((weight, index) => {
          const high = Boolean(number & weight);
          const trueX = railX(index, false);
          const inverseX = railX(index, true);
          const centre = (trueX + inverseX) / 2;
          return (
            <g key={weight}>
              <path
                className={styles.wire}
                data-on={high}
                d={`M${centre} ${SWITCH_Y + SWITCH_SIZE}V${SPLIT_Y}M${inverseX} ${NOT_Y}V${SPLIT_Y}H${trueX}V${RAIL_BOTTOM}`}
              />
              <path
                className={styles.wire}
                data-on={!high}
                data-rail={`not-${weight}`}
                d={`M${inverseX} ${RAIL_TOP}V${RAIL_BOTTOM}`}
              />
              <path className={styles.gate} data-on={!high} d={notGate(inverseX)} />
              <circle
                className={styles.gate}
                data-on={!high}
                cx={inverseX}
                cy={NOT_Y + 12}
                r={2.4}
              />
              <text x={centre} y={SWITCH_Y - 4} className={styles.weight}>
                {weight}
              </text>
              <Control
                label={`Bit ${weight}`}
                pressed={high}
                onPress={() => setNumber((current) => current ^ weight)}
              >
                <rect
                  x={centre - SWITCH_SIZE / 2}
                  y={SWITCH_Y}
                  width={SWITCH_SIZE}
                  height={SWITCH_SIZE}
                  rx={4}
                />
                <text x={centre} y={SWITCH_Y + 17}>
                  {high ? 1 : 0}
                </text>
              </Control>
            </g>
          );
        })}

        {COLUMNS.map((name, column) => {
          const on = bars[SEGMENTS.indexOf(name)];
          const x = columnX(column);
          return (
            <g key={name}>
              <path
                className={styles.wire}
                data-on={on}
                d={`M${x} ${OR_BOTTOM - 2}V${rowY(Math.max(...DIGITS.filter((digit) => lights(digit, column))))}`}
              />
              <path className={styles.wire} data-on={on} d={barWire(column)} />
              <path className={styles.gate} data-on={on} d={orGate(x)} />
              <text x={x} y={OR_BOTTOM - 4} className={styles.pin}>
                {name}
              </text>
            </g>
          );
        })}

        {DIGITS.map((digit) => {
          const y = rowY(digit);
          const on = lines[digit];
          return (
            <g key={digit} data-digit={digit} data-on={on}>
              <path className={styles.wire} data-on={on} d={`M24 ${y}H${AND_X}`} />
              <path
                className={styles.wire}
                data-on={on}
                d={`M${AND_X + AND_WIDTH} ${y}H${columnX(Math.max(...COLUMNS.flatMap((_, column) => (lights(digit, column) ? [column] : []))))}`}
              />
              <path className={styles.gate} data-on={on} d={andGate(y)} />
              {digitInputs(digit).map((input, index) => (
                <circle
                  key={input.weight}
                  className={styles.tap}
                  data-on={railHigh(number, input)}
                  cx={railX(index, input.inverted)}
                  cy={y}
                  r={2.6}
                />
              ))}
              {COLUMNS.map((name, column) =>
                lights(digit, column) ? (
                  <circle
                    key={name}
                    className={styles.tap}
                    data-on={on}
                    cx={columnX(column)}
                    cy={y}
                    r={2.6}
                  />
                ) : null,
              )}
              <Control label={`Digit ${digit}`} pressed={on} onPress={() => setNumber(digit)}>
                <rect x={4} y={y - 8.5} width={20} height={17} rx={3} />
                <text x={14} y={y + 4}>
                  {digit}
                </text>
              </Control>
            </g>
          );
        })}

        <g>
          {SEGMENT_BARS.map(([x, y, width, height], index) => {
            const [left, top] = barAt(x, y);
            return (
              <rect
                key={SEGMENTS[index]}
                className={styles.bar}
                data-segment={SEGMENTS[index]}
                data-on={bars[index]}
                x={left}
                y={top}
                width={width * BAR_SCALE}
                height={height * BAR_SCALE}
                rx={2}
              />
            );
          })}
        </g>
      </svg>
      <span className="sr-only" aria-live="polite">
        {binary} is {number}.{" "}
        {number < 10 ? `The display shows ${number}.` : "The display is blank."}
      </span>
    </section>
  );
}

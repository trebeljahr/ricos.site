import type { CSSProperties } from "react";
import { polylinePath } from "src/lib/computer/wireGeometry";
import type { Point } from "src/lib/computer/wireRouting";
import own from "./SwitchLogic.module.css";
import { WAVE_MS } from "./useGateRipple";
export type Control = "A" | "B";
/**
 * One component and geometry for the first lamp demo and every transistor input.
 * A control is a two-way selector: its common contact on the right joins either
 * battery contact on the left, so a gate is always driven and never left floating.
 */
export function KnifeSwitch({
  name,
  x,
  y,
  closed,
  active = false,
  control = false,
  boardWidth = 800,
  boardHeight = 560,
  onFlip,
}: {
  name: Control;
  x: number;
  y: number;
  closed: boolean;
  active?: boolean;
  control?: boolean;
  boardWidth?: number;
  boardHeight?: number;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      className={own.knifeSwitch}
      style={{
        left: `${(x / boardWidth) * 100}%`,
        top: `${(y / boardHeight) * 100}%`,
        width: `${(154 / boardWidth) * 100}%`,
        height: `${(94 / boardHeight) * 100}%`,
      }}
      aria-pressed={closed}
      aria-label={
        control
          ? `Control ${name}: ${closed ? "high" : "low"}; selector on battery ${closed ? "plus" : "minus"}. Click to select battery ${closed ? "minus" : "plus"}.`
          : `Switch ${name}: ${closed ? "closed" : "open"}. Click to ${closed ? "open" : "close"}.`
      }
      onClick={onFlip}
    >
      <span className={own.switchBase} aria-hidden="true">
        {control ? (
          <>
            <i className={own.contactLeft} data-throw="high" />
            <i className={own.contactLeft} data-throw="low" />
          </>
        ) : (
          <i className={own.contactLeft} />
        )}
        <i className={own.contactRight} />
        <span className={control ? own.selectorBlade : own.blade} data-closed={closed}>
          <i />
        </span>
        {active && <span className={control ? own.selectorCurrent : own.currentContact} />}
      </span>
      <span className={own.contactName}>
        {name}
        {control && ` = ${Number(closed)}`}
      </span>
    </button>
  );
}

export function Cable({
  d,
  returning = false,
  signal = false,
  high = false,
  active = false,
  color,
}: {
  d: string;
  returning?: boolean;
  signal?: boolean;
  high?: boolean;
  active?: boolean;
  color?: string;
}) {
  return (
    <g
      data-current={active || undefined}
      data-signal={signal || undefined}
      data-high={signal ? high : undefined}
    >
      <path
        d={d}
        style={color ? { stroke: color } : undefined}
        className={signal ? own.signalCable : returning ? own.returnCable : own.cable}
      />
      {active && (
        <>
          <path d={d} className={own.currentCable} />
          <path d={d} className={own.currentFlow} />
        </>
      )}
    </g>
  );
}
export type VoltageWave = {
  id: string;
  /** New voltage of the wire. */
  high: boolean;
  /** Rail and switch the wave passes first; those already hold this voltage. */
  lead?: Point[];
  /** The wire that changes voltage behind the wave, ending at a gate. */
  wire: Point[];
};

const lengthOf = (points: Point[]) =>
  points.reduce(
    (sum, point, index) =>
      index ? sum + Math.hypot(point.x - points[index - 1].x, point.y - points[index - 1].y) : 0,
    0,
  );

/**
 * A voltage change moving down a wire at one speed. The wire takes its new colour
 * behind the head and keeps it after the head has gone: voltage stays, current stops.
 */
export function VoltageWaves({
  waves,
  width,
  height,
}: {
  waves: VoltageWave[];
  width: number;
  height: number;
}) {
  const routes = waves.map((wave) => {
    const route = [...(wave.lead ?? []), ...wave.wire];
    return { ...wave, route, leadLength: lengthOf(wave.lead ?? []), length: lengthOf(route) };
  });
  const msPerUnit = WAVE_MS / Math.max(1, ...routes.map((route) => route.length));
  return (
    <svg className={own.gatePulse} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {routes.map(({ id, high, route, wire, leadLength, length }) => {
        const wireLength = length - leadLength;
        return (
          <g key={id} data-high={high}>
            <path
              className={own.waveFill}
              d={polylinePath(wire)}
              pathLength={wireLength}
              style={
                {
                  "--wave-length": wireLength,
                  animationDelay: `${leadLength * msPerUnit}ms`,
                  animationDuration: `${wireLength * msPerUnit}ms`,
                } as CSSProperties
              }
            />
            <path
              className={own.waveHead}
              data-gate-pulse
              d={polylinePath(route)}
              pathLength={length}
              style={
                {
                  "--wave-length": length,
                  animationDuration: `${length * msPerUnit}ms`,
                } as CSSProperties
              }
            />
          </g>
        );
      })}
    </svg>
  );
}
export function Terminal({ x, y, junction = false }: { x: number; y: number; junction?: boolean }) {
  return (
    <circle className={junction ? own.junction : own.terminal} cx={x} cy={y} r={junction ? 4 : 5} />
  );
}

export function Battery({
  x = 48,
  y = 220,
  boardWidth = 800,
  boardHeight = 560,
}: {
  x?: number;
  y?: number;
  boardWidth?: number;
  boardHeight?: number;
}) {
  return (
    <div
      className={own.battery}
      role="img"
      aria-label="Battery"
      style={{
        left: `${(x / boardWidth) * 100}%`,
        top: `${(y / boardHeight) * 100}%`,
        width: `${(64 / boardWidth) * 100}%`,
        height: `${(128 / boardHeight) * 100}%`,
      }}
    >
      <i />
      <span className={own.batteryPositive}>+</span>
      <span className={own.batteryNegative}>−</span>
    </div>
  );
}
export function Lamp({
  lit,
  x = 650,
  y = 229,
  boardWidth = 800,
  boardHeight = 560,
}: {
  lit: boolean;
  x?: number;
  y?: number;
  boardWidth?: number;
  boardHeight?: number;
}) {
  return (
    <div
      className={own.lamp}
      data-on={lit}
      role="img"
      aria-label={`Output LAMP: ${Number(lit)}`}
      style={{
        left: `${(x / boardWidth) * 100}%`,
        top: `${(y / boardHeight) * 100}%`,
        width: `${(100 / boardWidth) * 100}%`,
        height: `${(128 / boardHeight) * 100}%`,
      }}
    >
      <div className={own.glass}>
        <i className={own.filament} />
        <i className={own.glassHighlight} />
      </div>
      <div className={own.socket} />
      <div className={own.lampBase}>
        <i />
        <i />
      </div>
    </div>
  );
}

import type { CSSProperties } from "react";
import own from "./SwitchLogic.module.css";
export type Control = "A" | "B";
/**
 * One component and geometry for the first lamp demo and every transistor input.
 * A control closes the path from battery plus to a gate; a pull-down resistor
 * empties the gate again when it opens, so a gate is never left floating.
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
          ? `Control ${name}: ${closed ? "high" : "low"}. Click to ${closed ? "open" : "close"}.`
          : `Switch ${name}: ${closed ? "closed" : "open"}. Click to ${closed ? "open" : "close"}.`
      }
      onClick={onFlip}
    >
      <span className={own.switchBase} aria-hidden="true">
        <i className={own.contactLeft} />
        <i className={own.contactRight} />
        <span className={own.blade} data-closed={closed}>
          <i />
        </span>
        {active && <span className={own.currentContact} />}
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
/** A vertical resistor drawn over a wire. */
export function Resistor({ x, y }: { x: number; y: number }) {
  return (
    <g data-resistor="">
      <rect className={own.resistor} x={x - 8} y={y - 20} width="16" height="40" rx="3" />
      <path
        className={own.resistorBands}
        d={`M${x - 8} ${y - 10} h16 M${x - 8} ${y} h16 M${x - 8} ${y + 10} h16`}
      />
    </g>
  );
}

/**
 * The charge a gate capacitor holds. The marks fade in as it fills and out as it
 * empties. Nothing else waits for them: the lamp follows the switch at once.
 */
export function GateCharges({
  sign,
  charged,
  at,
}: {
  sign: "plus" | "minus";
  charged: boolean;
  at: readonly (readonly [number, number])[];
}) {
  return (
    <g data-gate-charge={sign} data-charged={charged}>
      {at.map(([x, y], index) => (
        <path
          key={`${x}-${y}`}
          className={`${own.charge} ${sign === "plus" ? own.chargePlus : own.chargeMinus}`}
          style={{ "--charge-index": index } as CSSProperties}
          d={sign === "plus" ? `M${x - 4} ${y} h8 M${x} ${y - 4} v8` : `M${x - 4} ${y} h8`}
        />
      ))}
    </g>
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

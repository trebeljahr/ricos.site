import own from "./SwitchLogic.module.css";
export type Control = "A" | "B";
/** One component and geometry for the first lamp demo and every transistor input. */
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
          ? `Control ${name}: ${closed ? "high" : "low"}; switch ${closed ? "closed" : "open"}. Click to ${closed ? "open" : "close"}.`
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

/** Passive input bias; the shared digital simulator already defines open inputs as 0. */
export function PullDown({
  x,
  top,
  bottom,
  name,
}: {
  x: number;
  top: number;
  bottom: number;
  name: Control;
}) {
  return (
    <g>
      <title>{`Pull-down resistor for ${name}: holds the open input at 0`}</title>
      <rect className={own.resistor} x={x - 6} y={top} width="12" height={bottom - top} rx="1" />
    </g>
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

import own from "./SwitchLogic.module.css";
export type Control = "A" | "B";
/** SPDT: the common terminal always selects one of the battery's two rails. */
export function ControlSwitch({
  name,
  x,
  high,
  onFlip,
  y = 425,
  boardWidth = 800,
  boardHeight = 560,
}: {
  name: Control;
  x: number;
  high: boolean;
  onFlip: () => void;
  y?: number;
  boardWidth?: number;
  boardHeight?: number;
}) {
  return (
    <button
      type="button"
      className={own.controlSwitch}
      style={{
        left: `${(x / boardWidth) * 100}%`,
        top: `${(y / boardHeight) * 100}%`,
        width: `${(120 / boardWidth) * 100}%`,
        height: `${(100 / boardHeight) * 100}%`,
      }}
      aria-pressed={high}
      aria-label={`Control ${name}: ${high ? "high" : "low"}. Connect gate to battery ${high ? "negative" : "positive"}.`}
      onClick={onFlip}
    >
      <svg viewBox="-60 -50 120 100" aria-hidden="true">
        <rect className={own.selectorBase} x="-56" y="-32" width="112" height="76" rx="7" />
        <path className={own.deviceLead} d="M0 -40 V-10 M-32 10 V20 M32 10 V20" />
        <text className={own.selectorRail} x="-32" y="34">
          −
        </text>
        <text className={own.selectorRail} x="32" y="34">
          +
        </text>
        <circle className={own.terminal} cx="-32" cy="10" r="5" />
        <circle className={own.terminal} cx="32" cy="10" r="5" />
        <path className={own.selectorBlade} data-high={high} d="M0 -10 L-32 10" />
        <circle className={own.terminal} cx="0" cy="-10" r="5" />
      </svg>
      <span className={own.controlLabel}>{name}</span>
    </button>
  );
}

export function Cable({
  d,
  returning = false,
  signal = false,
  high = false,
  color,
}: {
  d: string;
  returning?: boolean;
  signal?: boolean;
  high?: boolean;
  color?: string;
}) {
  return (
    <g data-signal={signal || undefined} data-high={signal ? high : undefined}>
      <path
        d={d}
        style={color ? { stroke: color } : undefined}
        className={signal ? own.signalCable : returning ? own.returnCable : own.cable}
      />
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

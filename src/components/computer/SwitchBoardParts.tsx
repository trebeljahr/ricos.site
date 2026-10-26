import own from "./SwitchLogic.module.css";
export type Control = "A" | "B";
export function SwitchContact({
  closed,
  active,
  reverse,
  selector = false,
}: {
  closed: boolean;
  active: boolean;
  reverse: boolean;
  selector?: boolean;
}) {
  return (
    <span
      className={selector ? `${own.switchBase} ${own.selectorSwitchBase}` : own.switchBase}
      aria-hidden="true"
    >
      <i className={own.contactLeft} />
      <i className={own.contactRight} />
      {selector && <i className={own.selectorPivot} />}
      <span className={own.blade} data-closed={closed}>
        <i />
      </span>
      {active && <span className={own.currentContact} data-reverse={reverse} />}
    </span>
  );
}

export function ControlSwitch({
  name,
  x,
  high,
  above = true,
  below = false,
  y = 425,
  boardWidth = 800,
  boardHeight = 560,
  onFlip,
}: {
  name: Control;
  x: number;
  high: boolean;
  above?: boolean;
  below?: boolean;
  boardHeight?: number;
  boardWidth?: number;
  y?: number;
  onFlip: () => void;
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
      <SwitchContact closed={high} active={false} reverse={false} selector />
      <svg viewBox="-60 -50 120 100" aria-hidden="true">
        <path
          className={own.deviceLead}
          d={`${above ? "M0 -10 V-40" : ""} ${below ? "M0 -10 V40" : ""} M-32 10 V20 M32 10 V20`}
        />
        <text className={own.selectorRail} x="-32" y="34">
          −
        </text>
        <text className={own.selectorRail} x="32" y="34">
          +
        </text>
      </svg>
      <span className={own.controlLabel}>
        {name} = {Number(high)}
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

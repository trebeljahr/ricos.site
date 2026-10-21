import { type CSSProperties, createContext, type ReactNode } from "react";
import styles from "./SemiconductorDemo.module.css";

type Direction = "electrons" | "current";

const MIT =
  "https://ocw.mit.edu/courses/6-012-microelectronic-devices-and-circuits-spring-2009/resources/";
const TOSHIBA = "https://toshiba.semicon-storage.com/us/semiconductor/knowledge/";
export const SOURCES = {
  lattice: `${MIT}mit6_012s09_lec02/`,
  donor: `${TOSHIBA}e-learning/discrete/chap1/chap1-3.html`,
  acceptor: `${TOSHIBA}e-learning/discrete/chap1/chap1-4.html`,
  vacancy:
    "https://ocw.mit.edu/courses/3-091sc-introduction-to-solid-state-chemistry-fall-2010/91578fa1c9dd3badf920ba989def52cb_Fg78tInX5Vg.pdf",
  junction: `${MIT}mit6_012s09_lec14/`,
  bjt: `${MIT}mit6_012s09_lec17/`,
  mosfet: `${MIT}mit6_012s09_lec08/`,
  gateCharge: `${TOSHIBA}faq/mosfet/electrical-characteristics-of-mosfetscharge-characteristic-qg-qg.html`,
  leakage:
    "https://toshiba.semicon-storage.com/eu/semiconductor/knowledge/faq/mosfet/why-do-toshibas-power-mosfets-exhibit-larger-gate-source-leakage.html",
  finfet:
    "https://www.intc.com/news-events/press-releases/detail/655/intel-reinvents-transistors-using-new-3-d-structure",
};

export function Choice<T extends string>({
  label,
  value,
  choices,
  onChange,
}: {
  label: string;
  value: T;
  choices: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className={styles.choices} aria-label={label}>
      {choices.map((choice) => (
        <button
          type="button"
          key={choice.value}
          aria-pressed={value === choice.value}
          onClick={() => onChange(choice.value)}
        >
          {choice.label}
        </button>
      ))}
    </fieldset>
  );
}

export const MotionContext = createContext(true);

export function Diagram({
  label,
  children,
  split = false,
}: {
  label: string;
  children: ReactNode;
  split?: boolean;
}) {
  if (split)
    return (
      <div className={styles.splitDiagram} role="img" aria-label={label}>
        {["0 0 345 420", "345 0 315 420"].map((viewBox) => (
          <svg
            key={viewBox}
            className={styles.diagram}
            viewBox={viewBox}
            aria-hidden="true"
            focusable="false"
          >
            {children}
          </svg>
        ))}
      </div>
    );
  return (
    <div className={styles.diagramStage}>
      <svg className={styles.diagram} viewBox="0 0 660 420" role="img" aria-label={label}>
        <title>{label}</title>
        {children}
      </svg>
    </div>
  );
}

export function Details({ children }: { children: ReactNode }) {
  return (
    <details className={styles.details}>
      <summary>How this model works · sources</summary>
      {children}
    </details>
  );
}

/** Repeating symbols indicate net transport, not literal ballistic trajectories. */
export function Flow({
  x1,
  x2,
  y,
  kind = "electron",
  count = 7,
  duration = 2.8,
}: {
  x1: number;
  x2: number;
  y: number;
  kind?: "electron" | "hole";
  count?: number;
  duration?: number;
}) {
  return (
    <g data-flow={kind}>
      {Array.from({ length: count }, (_, index) => (
        <g
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed illustrative particle slots have no local state
          key={`carrier-${index}`}
          className={styles.flow}
          style={
            {
              "--travel-x": `${x2 - x1}px`,
              "--travel-y": "0px",
              "--rest-x": `${((index + 0.5) / count) * (x2 - x1)}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${(-index * duration) / count}s`,
            } as CSSProperties
          }
        >
          <Charge x={x1} y={y} kind={kind} />
        </g>
      ))}
    </g>
  );
}

/** Direction symbols show net transport, never an individual carrier's trajectory. */
export function Arrow({
  x1,
  x2,
  y,
  label,
  weak = false,
  field = false,
}: {
  x1: number;
  x2: number;
  y: number;
  label?: string;
  weak?: boolean;
  field?: boolean;
}) {
  const direction = x2 > x1 ? 1 : -1;
  return (
    <g className={field ? styles.fieldArrow : styles.transport} data-weak={weak || undefined}>
      <line x1={x1} x2={x2} y1={y} y2={y} strokeDasharray={weak ? "4 6" : undefined} />
      <path
        d={`M ${x2 - direction * 10} ${y - 6} L ${x2} ${y} L ${x2 - direction * 10} ${y + 6}`}
      />
      {label && (
        <text x={(x1 + x2) / 2} y={y - 13} textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
}

export function Charge({
  x,
  y,
  kind,
}: {
  x: number;
  y: number;
  kind: "electron" | "hole" | "donor" | "acceptor";
}) {
  const mobile = kind === "electron" || kind === "hole";
  const positive = kind === "hole" || kind === "donor";
  return (
    <g className={mobile ? (kind === "electron" ? styles.electron : styles.hole) : styles.ion}>
      {mobile ? (
        <circle cx={x} cy={y} r={9} />
      ) : (
        <rect x={x - 9} y={y - 9} width={18} height={18} rx={2} />
      )}
      <text x={x} y={y + 5} textAnchor="middle">
        {positive ? "+" : "−"}
      </text>
    </g>
  );
}

export function DirectionChoice({
  value,
  onChange,
}: {
  value: Direction;
  onChange: (direction: Direction) => void;
}) {
  return (
    <Choice
      label="Arrow convention"
      value={value}
      onChange={onChange}
      choices={[
        { value: "electrons", label: "Electron motion" },
        { value: "current", label: "Conventional current" },
      ]}
    />
  );
}

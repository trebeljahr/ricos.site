import clsx from "clsx";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { switchLampDemo } from "src/lib/computer/demoCircuits";
import { bit, evalGate, inputRows, rowIndex } from "src/lib/computer/gateLogic";
import { initialSnapshot, step } from "src/lib/computer/logic";
import panel from "./ByteExplorer.module.css";
import styles from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";
import gates from "./GateDemos.module.css";
import own from "./SwitchLogic.module.css";

export type SwitchWiring = "series" | "parallel";
type LampWiring = SwitchWiring | "single";
const WIRINGS: Record<LampWiring, { key: string; gate: "and" | "or"; path: string }> = {
  single: {
    key: "ONE SWITCH",
    gate: "and",
    path: "A high control voltage lets current pass through the transistor. A low control voltage stops it.",
  },
  series: {
    key: "IN A ROW",
    gate: "and",
    path: "The current has one path. It has to pass A and then B.",
  },
  parallel: {
    key: "SIDE BY SIDE",
    gate: "or",
    path: "The current has two paths. A closes one, B closes the other.",
  },
};

/** A native button is the physical switch itself, including its handle and contacts. */
function KnifeSwitch({
  x,
  y,
  closed,
  name,
  onFlip,
}: {
  x: number;
  y: number;
  closed: boolean;
  name: string;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      className={own.knifeSwitch}
      style={{ left: `${x / 6}%`, top: `${y / 4.2}%` }}
      aria-pressed={closed}
      aria-label={`Switch ${name}: ${closed ? "closed" : "open"}. Click to ${closed ? "open" : "close"}.`}
      onClick={onFlip}
    >
      <span className={own.switchBase} aria-hidden="true">
        <i className={own.contactLeft} />
        <i className={own.contactRight} />
        <span className={own.blade} data-closed={closed}>
          <i />
        </span>
      </span>
      <span className={own.switchLabel}>
        {name} · {closed ? "CLOSED · 1" : "OPEN · 0"}
      </span>
    </button>
  );
}

function TransistorSwitch({
  x,
  y,
  closed,
  name,
  onFlip,
}: {
  x: number;
  y: number;
  closed: boolean;
  name: string;
  onFlip: () => void;
}) {
  return (
    <div className={own.transistorSwitch} style={{ left: `${x / 6}%`, top: `${y / 4.2}%` }}>
      <div
        className={own.transistor}
        data-on={closed}
        role="img"
        aria-label={`Transistor ${name}: ${closed ? "conducting" : "blocking"}`}
      >
        <i className={own.leadLeft} />
        <i className={own.leadRight} />
        <i className={own.controlLead} />
        <span className={own.package}>
          NMOS<span>{name}</span>
        </span>
      </div>
      <button
        type="button"
        className={own.voltage}
        aria-pressed={closed}
        aria-label={`Control ${name}: ${closed ? "high" : "low"} voltage. Toggle control voltage.`}
        onClick={onFlip}
      >
        <i aria-hidden="true" />
        {name} · {closed ? "HIGH · 1" : "LOW · 0"}
      </button>
    </div>
  );
}

function Cable({ d, returning = false }: { d: string; returning?: boolean }) {
  return (
    <g>
      <path d={d} className={own.cableShadow} />
      <path d={d} className={returning ? own.returnCable : own.cable} />
      <path d={d} className={own.cableShine} />
    </g>
  );
}

/** Physical switch analogy; the shared circuit engine supplies the lamp's state. */
function SwitchBoard({
  wiring,
  a,
  b,
  lit,
  electrical,
  onFlip,
}: {
  wiring: LampWiring;
  a: boolean;
  b: boolean;
  lit: boolean;
  electrical: boolean;
  onFlip: (name: "A" | "B") => void;
}) {
  const parallel = wiring === "parallel";
  const single = wiring === "single";
  const positions = parallel
    ? [
        [295, 95],
        [295, 245],
      ]
    : single
      ? [[295, 135]]
      : [
          [210, 135],
          [385, 135],
        ];
  const Switch = electrical ? TransistorSwitch : KnifeSwitch;
  return (
    <div
      className={own.board}
      role="group"
      aria-label={
        electrical ? "Electrically controlled switches and a lamp" : "Physical switches and a lamp"
      }
    >
      <svg className={own.cables} viewBox="0 0 600 420" aria-hidden="true">
        {parallel ? (
          <>
            <Cable d="M80 230 C48 185 106 95 180 95 L239 95" />
            <Cable d="M180 95 C150 140 160 245 239 245" />
            <Cable d="M351 95 C438 95 458 145 457 180 C456 225 490 240 485 290" />
            <Cable d="M351 245 C415 245 457 230 457 180" />
          </>
        ) : (
          <>
            <Cable d={`M80 230 C55 158 95 135 ${positions[0][0] - 56} 135`} />
            {!single && <Cable d="M266 135 C285 120 310 150 329 135" />}
            <Cable d={`M${single ? 351 : 441} 135 C490 130 475 235 485 290`} />
          </>
        )}
        <Cable d="M525 290 C566 360 468 378 365 366 C255 352 133 397 80 340" returning />
      </svg>
      <div className={own.battery} role="img" aria-label="Battery">
        <i />{" "}
        <span>
          +<b>BATTERY</b>−
        </span>
      </div>
      {positions.map(([x, y], index) => (
        <Switch
          key={index === 0 ? "A" : "B"}
          x={x}
          y={y}
          closed={index === 0 ? a : b}
          name={index === 0 ? "A" : "B"}
          onFlip={() => onFlip(index === 0 ? "A" : "B")}
        />
      ))}
      <div className={own.lamp} data-on={lit} role="img" aria-label={`Output LAMP: ${bit(lit)}`}>
        <div className={own.glass}>
          <i className={own.filament} />
          <i className={own.glassHighlight} />
        </div>
        <div className={own.socket} />
        <div className={own.lampBase}>
          <i />
          <i />
        </div>
        <span className={own.lampLabel}>LAMP · {lit ? "ON · 1" : "OFF · 0"}</span>
      </div>
    </div>
  );
}

export function SwitchLogic({
  wiring = "series",
  fixed = false,
}: {
  wiring?: SwitchWiring;
  fixed?: boolean;
}) {
  return <SwitchExperiment wiring={wiring} fixed={fixed} />;
}

/** The later teaching step: a voltage controls the same series/parallel paths. */
export function TransistorSwitches({
  wiring = "single",
  fixed = false,
}: {
  wiring?: LampWiring;
  fixed?: boolean;
}) {
  return <SwitchExperiment wiring={wiring} fixed={fixed} electrical />;
}

function SwitchExperiment({
  wiring: initialWiring = "series",
  fixed = false,
  electrical = false,
}: {
  wiring?: LampWiring;
  electrical?: boolean;
  /** Hides the wiring keys, for a spot in the text about one wiring. */
  fixed?: boolean;
}) {
  const [wiring, setWiring] = useState<LampWiring>(initialWiring);
  const [inputs, setInputs] = useState([false, false]);
  const [tried, setTried] = useState<ReadonlySet<number>>(() => new Set([0]));
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const [a, b] = inputs;
  const { gate } = WIRINGS[wiring];
  const circuit = useMemo(() => switchLampDemo(wiring), [wiring]);
  const lit = useMemo(
    () => step(circuit, initialSnapshot(), false, {}, { a, b }).values.lamp,
    [circuit, a, b],
  );
  const inputCount = wiring === "single" ? 1 : 2;
  const current = wiring === "single" ? Number(a) : rowIndex(inputs);
  const found = tried.size;

  function set(next: boolean[]) {
    setInputs(next);
    setTried((previous) =>
      new Set(previous).add(wiring === "single" ? Number(next[0]) : rowIndex(next)),
    );
  }
  function rewire(next: LampWiring) {
    if (next === wiring) return;
    const nextInputs = next === "single" ? [a, false] : inputs;
    setInputs(nextInputs);
    setWiring(next);
    setTried(new Set([next === "single" ? Number(a) : rowIndex(nextInputs)]));
    playButton();
  }

  const columns = { "--columns": `repeat(${inputCount + 1}, minmax(0, 1fr))` } as CSSProperties;

  return (
    <DemoMachine
      title={electrical ? "SWITCHES CONTROLLED BY ELECTRICITY" : "SWITCHES AND A LAMP"}
      label={electrical ? "Transistors and a lamp" : "Two switches and a lamp"}
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={gates.demo}
    >
      <div className={styles.body}>
        <div className={styles.plate}>
          <div className={clsx(panel.sectionHead, gates.headWrap)}>
            <span>{fixed ? WIRINGS[wiring].key : "WIRING"}</span>
            {!fixed && (
              <div
                className={styles.segmented}
                role="group"
                aria-label="How the switches are wired"
              >
                {(
                  (electrical
                    ? ["single", "series", "parallel"]
                    : ["series", "parallel"]) as LampWiring[]
                ).map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={wiring === name}
                    onClick={() => rewire(name)}
                  >
                    {WIRINGS[name].key}
                  </button>
                ))}
              </div>
            )}
          </div>
          <SwitchBoard
            wiring={wiring}
            a={a}
            b={b}
            lit={lit}
            electrical={electrical}
            onFlip={(name) => {
              set(name === "A" ? [!a, b] : [a, !b]);
              playSwitch();
            }}
          />
          <p className={own.instruction}>
            {electrical
              ? "Change the control voltage to open or close a transistor."
              : "Click a switch handle to open or close the path."}
          </p>
          <p className={gates.note}>
            {WIRINGS[wiring].path} 1 means{" "}
            {electrical ? "the control voltage is high." : "a switch is closed."}
          </p>
        </div>
        <div className={styles.plate}>
          <div className={panel.sectionHead}>
            <span>CASES TRIED</span>
            <span aria-live="polite">
              {found} OF {2 ** inputCount}
            </span>
          </div>
          <div className={gates.tableHead} style={columns} aria-hidden="true">
            <span>A</span>
            {inputCount === 2 && <span>B</span>}
            <span className={gates.split}>LAMP</span>
          </div>
          <ol className={gates.table} aria-label="Cases tried so far">
            {inputRows(inputCount).map((row, index) => {
              const known = tried.has(index);
              const out = wiring === "single" ? row[0] : evalGate(gate, row[0], row[1]);
              return (
                <li key={row.map(bit).join("")}>
                  <button
                    type="button"
                    className={gates.row}
                    style={columns}
                    aria-current={index === current ? "true" : undefined}
                    aria-label={`A ${bit(row[0])}${inputCount === 2 ? `, B ${bit(row[1])}` : ""}: lamp ${known ? (out ? "on" : "off") : "not tried yet"}. Set the switches to this case.`}
                    onClick={() => {
                      set([row[0], row[1] ?? false]);
                      playSwitch();
                    }}
                  >
                    <span>{bit(row[0])}</span>
                    {inputCount === 2 && <span>{bit(row[1])}</span>}
                    <span
                      className={clsx(
                        gates.split,
                        known && out && gates.out1,
                        !known && gates.hidden,
                      )}
                    >
                      {known ? (out ? "ON" : "OFF") : "?"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </DemoMachine>
  );
}

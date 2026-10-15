import clsx from "clsx";
import type { CSSProperties } from "react";
import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { bit, evalGate, GATE_RULES, inputRows, rowIndex } from "src/lib/computer/gateLogic";
import panel from "./ByteExplorer.module.css";
import styles from "./Codebook.module.css";
import { DemoMachine, MiniButton } from "./CodebookParts";
import gates from "./GateDemos.module.css";
import { GateShape, gatePorts, InputMark, LampMark, WirePath } from "./GateDiagram";
import own from "./SwitchLogic.module.css";
import { InputKey, OutputLamp } from "./TruthTables";

export type SwitchWiring = "series" | "parallel";

const WIRINGS: Record<
  SwitchWiring,
  { key: string; gate: "and" | "or"; path: string; reveal: string }
> = {
  series: {
    key: "IN A ROW",
    gate: "and",
    path: "The current has one path. It has to pass A and then B.",
    reveal: "Two switches in a row work like an AND gate.",
  },
  parallel: {
    key: "SIDE BY SIDE",
    gate: "or",
    path: "The current has two paths. A closes one, B closes the other.",
    reveal: "Two switches side by side work like an OR gate.",
  },
};

type Point = { x: number; y: number };

/**
 * A knife switch from `from` to `to` on a horizontal wire. Closed, the blade
 * lies on the wire; open, it points up and the gap stops the current.
 */
function KnifeSwitch({
  from,
  to,
  closed,
  name,
}: {
  from: Point;
  to: Point;
  closed: boolean;
  name: string;
}) {
  const length = to.x - from.x;
  const tip = closed
    ? to
    : { x: from.x + length * Math.cos(-0.6), y: from.y + length * Math.sin(-0.6) };
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={tip.x}
        y2={tip.y}
        className={clsx(own.blade, closed && own.bladeClosed)}
      />
      <circle cx={from.x} cy={from.y} r="3.5" className={own.contact} />
      <circle cx={to.x} cy={to.y} r="3.5" className={own.contact} />
      <text x={(from.x + to.x) / 2} y={from.y + 16} className={gates.portName} textAnchor="middle">
        {name}
      </text>
    </g>
  );
}

/** A wire segment that glows while current flows, with dashes moving along it. */
function Current({ points, on }: { points: Point[]; on: boolean }) {
  const d = points.map((point, index) => `${index ? "L" : "M"}${point.x} ${point.y}`).join(" ");
  return (
    <>
      <path d={d} className={clsx(gates.wire, on && gates.wireOn)} />
      {on && <path d={d} className={own.flow} />}
    </>
  );
}

/** A battery across a vertical wire: the long plate (+) on top at `y - 6`, the short one at `y + 6`. */
function Battery({ x, y: middle }: { x: number; y: number }) {
  return (
    <g>
      <line x1={x - 15} y1={middle - 6} x2={x + 15} y2={middle - 6} className={own.plate} />
      <line x1={x - 8} y1={middle + 6} x2={x + 8} y2={middle + 6} className={own.plateShort} />
      <text x={x + 22} y={middle - 8} className={gates.portName}>
        +
      </text>
      <text x={x + 22} y={middle + 9} className={gates.portName}>
        −
      </text>
    </g>
  );
}

function Bulb({ x, y, on }: { x: number; y: number; on: boolean }) {
  return (
    <g>
      {on && <circle cx={x} cy={y} r="27" className={own.halo} />}
      <circle cx={x} cy={y} r="15" className={clsx(own.bulb, on && own.bulbOn)} />
      <path
        d={`M${x - 8} ${y + 8} L${x - 4} ${y - 4} L${x} ${y + 3} L${x + 4} ${y - 4} L${x + 8} ${y + 8}`}
        className={clsx(own.filament, on && own.filamentOn)}
      />
      <text x={x + 22} y={y} className={gates.portName}>
        LAMP
      </text>
    </g>
  );
}

/** Battery, two switches and a lamp, wired one way or the other. */
function SwitchBoard({ wiring, a, b }: { wiring: SwitchWiring; a: boolean; b: boolean }) {
  const lit = evalGate(WIRINGS[wiring].gate, a, b);
  const battery = 40;
  const lampX = 282;
  const bottom = 158;
  const label = `Battery, switch A ${a ? "closed" : "open"}, switch B ${b ? "closed" : "open"}, wired ${WIRINGS[wiring].key.toLowerCase()}. The lamp is ${lit ? "on" : "off"}.`;

  if (wiring === "series") {
    const top = 46;
    return (
      <svg viewBox="0 0 340 176" role="img" aria-label={label}>
        <Current
          points={[
            { x: battery, y: 96 },
            { x: battery, y: top },
            { x: 100, y: top },
          ]}
          on={lit}
        />
        <Current
          points={[
            { x: 140, y: top },
            { x: 180, y: top },
          ]}
          on={lit}
        />
        <Current
          points={[
            { x: 220, y: top },
            { x: lampX, y: top },
            { x: lampX, y: 92 },
          ]}
          on={lit}
        />
        <Current
          points={[
            { x: lampX, y: 122 },
            { x: lampX, y: bottom },
            { x: battery, y: bottom },
            { x: battery, y: 108 },
          ]}
          on={lit}
        />
        <KnifeSwitch from={{ x: 100, y: top }} to={{ x: 140, y: top }} closed={a} name="A" />
        <KnifeSwitch from={{ x: 180, y: top }} to={{ x: 220, y: top }} closed={b} name="B" />
        <Battery x={battery} y={102} />
        <Bulb x={lampX} y={107} on={lit} />
      </svg>
    );
  }

  const upper = 34;
  const lower = 82;
  const left = 96;
  const right = 214;
  return (
    <svg viewBox="0 0 340 176" role="img" aria-label={label}>
      <Current
        points={[
          { x: battery, y: 104 },
          { x: battery, y: upper },
          { x: left, y: upper },
        ]}
        on={lit}
      />
      <Current
        points={[
          { x: left, y: upper },
          { x: left, y: lower },
          { x: 136, y: lower },
        ]}
        on={b}
      />
      <Current
        points={[
          { x: left, y: upper },
          { x: 136, y: upper },
        ]}
        on={a}
      />
      <Current
        points={[
          { x: 176, y: upper },
          { x: right, y: upper },
        ]}
        on={a}
      />
      <Current
        points={[
          { x: 176, y: lower },
          { x: right, y: lower },
          { x: right, y: upper },
        ]}
        on={b}
      />
      <Current
        points={[
          { x: right, y: upper },
          { x: lampX, y: upper },
          { x: lampX, y: 100 },
        ]}
        on={lit}
      />
      <Current
        points={[
          { x: lampX, y: 130 },
          { x: lampX, y: bottom },
          { x: battery, y: bottom },
          { x: battery, y: 116 },
        ]}
        on={lit}
      />
      <circle
        cx={left}
        cy={upper}
        r="2.6"
        className={clsx(gates.junction, lit && gates.junctionOn)}
      />
      <circle
        cx={right}
        cy={upper}
        r="2.6"
        className={clsx(gates.junction, lit && gates.junctionOn)}
      />
      <KnifeSwitch from={{ x: 136, y: upper }} to={{ x: 176, y: upper }} closed={a} name="A" />
      <KnifeSwitch from={{ x: 136, y: lower }} to={{ x: 176, y: lower }} closed={b} name="B" />
      <Battery x={battery} y={110} />
      <Bulb x={lampX} y={115} on={lit} />
    </svg>
  );
}

/** The gate the switches stand for, with the same inputs. */
function RevealBoard({ gate, a, b }: { gate: "and" | "or"; a: boolean; b: boolean }) {
  const scale = 1.5;
  const x = 82;
  const y = 40 - 21 * scale;
  const ports = gatePorts(gate, x, y, scale);
  const output = evalGate(gate, a, b);
  return (
    <div className={gates.board}>
      <svg
        viewBox="0 0 250 80"
        role="img"
        aria-label={`${gate.toUpperCase()} gate with A ${bit(a)} and B ${bit(b)}: output ${bit(output)}.`}
      >
        {[a, b].map((on, index) => (
          <g key={index === 0 ? "A" : "B"}>
            <WirePath points={[{ x: 52, y: ports.inputs[index].y }, ports.inputs[index]]} on={on} />
            <InputMark x={52} y={ports.inputs[index].y} on={on} name={index === 0 ? "A" : "B"} />
          </g>
        ))}
        <GateShape
          gate={gate}
          x={x}
          y={y}
          scale={scale}
          inputs={[a, b]}
          output={output}
          label={gate.toUpperCase()}
        />
        <WirePath points={[ports.output, { x: 186, y: ports.output.y }]} on={output} />
        <LampMark x={194} y={ports.output.y} on={output} name="LAMP" />
      </svg>
    </div>
  );
}

/**
 * Two switches and a lamp: wire the switches in a row or side by side, try
 * every case, then reveal the logic gate each wiring is. Usable in MDX articles.
 */
export function SwitchLogic({
  wiring: initialWiring = "series",
  fixed = false,
}: {
  wiring?: SwitchWiring;
  /** Hides the wiring keys, for a spot in the text about one wiring. */
  fixed?: boolean;
}) {
  const [wiring, setWiring] = useState<SwitchWiring>(initialWiring);
  const [inputs, setInputs] = useState([false, false]);
  const [tried, setTried] = useState<ReadonlySet<number>>(() => new Set([0]));
  const [revealed, setRevealed] = useState(false);
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const [a, b] = inputs;
  const { gate } = WIRINGS[wiring];
  const lit = evalGate(gate, a, b);
  const current = rowIndex(inputs);
  const found = tried.size;

  function set(next: boolean[]) {
    setInputs(next);
    setTried((previous) => new Set(previous).add(rowIndex(next)));
  }
  function rewire(next: SwitchWiring) {
    setWiring(next);
    setTried(new Set([rowIndex(inputs)]));
    setRevealed(false);
    playButton();
  }

  const columns = { "--columns": "repeat(3, minmax(0, 1fr))" } as CSSProperties;

  return (
    <DemoMachine
      title="SWITCHES AND A LAMP"
      label="Two switches and a lamp"
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
                {(Object.keys(WIRINGS) as SwitchWiring[]).map((name) => (
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
          <div className={clsx(gates.board, own.board)}>
            <SwitchBoard wiring={wiring} a={a} b={b} />
          </div>
          <div className={gates.keys}>
            <InputKey
              name="A"
              on={a}
              onFlip={() => {
                set([!a, b]);
                playSwitch();
              }}
            />
            <InputKey
              name="B"
              on={b}
              onFlip={() => {
                set([a, !b]);
                playSwitch();
              }}
            />
            <span className={gates.arrow} aria-hidden="true">
              →
            </span>
            <OutputLamp name="LAMP" on={lit} />
          </div>
          <p className={gates.note}>{WIRINGS[wiring].path} 1 means a switch is closed.</p>
        </div>
        <div className={styles.plate}>
          <div className={panel.sectionHead}>
            <span>CASES TRIED</span>
            <span aria-live="polite">{found} OF 4</span>
          </div>
          <div className={gates.tableHead} style={columns} aria-hidden="true">
            <span>A</span>
            <span>B</span>
            <span className={gates.split}>LAMP</span>
          </div>
          <ol className={gates.table} aria-label="Cases tried so far">
            {inputRows(2).map((row, index) => {
              const known = tried.has(index);
              const out = evalGate(gate, row[0], row[1]);
              return (
                <li key={index}>
                  <button
                    type="button"
                    className={gates.row}
                    style={columns}
                    aria-current={index === current ? "true" : undefined}
                    aria-label={`A ${bit(row[0])}, B ${bit(row[1])}: lamp ${known ? (out ? "on" : "off") : "not tried yet"}. Set the switches to this case.`}
                    onClick={() => {
                      set(row);
                      playSwitch();
                    }}
                  >
                    <span>{bit(row[0])}</span>
                    <span>{bit(row[1])}</span>
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
          <div className={own.revealRow}>
            <MiniButton
              onClick={() => {
                setRevealed(!revealed);
                playButton();
              }}
            >
              {revealed ? "HIDE THE GATE" : "REVEAL THE GATE"}
            </MiniButton>
            {!revealed && (
              <span className={gates.note}>
                {found < 4 ? "Try all four cases first." : "All four cases found."}
              </span>
            )}
          </div>
          {revealed && (
            <div aria-live="polite">
              <RevealBoard gate={gate} a={a} b={b} />
              <p className={gates.rule}>
                {WIRINGS[wiring].reveal} {GATE_RULES[gate]}
              </p>
            </div>
          )}
        </div>
      </div>
    </DemoMachine>
  );
}

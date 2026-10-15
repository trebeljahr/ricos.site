import clsx from "clsx";
import type { CSSProperties } from "react";
import { useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  type Bit,
  CMOS_GATES,
  type CmosGate,
  type CmosStage,
  type CmosState,
  type CmosTransistor,
  cmosStages,
  cmosState,
  describeCmos,
  explainCmos,
  GATE_LABELS,
  inputCount,
  truthRows,
} from "src/lib/computer/cmosGates";
import { BLUEPRINT_RECIPES } from "src/lib/computer/logic";
import panel from "./ByteExplorer.module.css";
import shared from "./Codebook.module.css";
import { DemoMachine } from "./CodebookParts";
import { GateSymbol } from "./GateSymbol";
import styles from "./TransistorGates.module.css";

// Every gate shares one drawing scale, so a transistor is the same size in each.
const VIEW_WIDTH = 340;
const VIEW_HEIGHT = 330;
const VDD_Y = 30;
const GND_Y = 300;

type Segment = { d: string; net: string; via?: string };
type Placed = { transistor: CmosTransistor; x: number; y: number };
type Tag = { x: number; y: number; text: string; net: string };
type Point = { x: number; y: number; net: string };
type Layout = {
  width: number;
  railEnd: number;
  segments: Segment[];
  fets: Placed[];
  dots: Point[];
  tags: Tag[];
  output: { x: number; y: number };
  stageLabels: Array<{ x: number; text: string }>;
};

/** The two channel leads of a transistor centred at x, y, from `top` down to `bottom`. */
const leads = (transistor: CmosTransistor, x: number, y: number, top: number, bottom: number) => [
  { d: `M${x} ${top}V${y - 12}H${x - 9}`, net: transistor.ends[0], via: transistor.id },
  { d: `M${x - 9} ${y + 12}H${x}V${bottom}`, net: transistor.ends[1], via: transistor.id },
];

/** Where the input reaches the transistor: the gate plate, or the bubble of a pMOS. */
const gateX = (transistor: CmosTransistor, x: number) => x - (transistor.channel === "p" ? 26 : 16);

/** A labelled input stub, A or B, ending at the transistor's gate. */
function inputStub(placed: Placed, layout: Layout) {
  const { transistor, x, y } = placed;
  layout.segments.push({ d: `M${gateX(transistor, x)} ${y}H${x - 42}`, net: transistor.gate });
  layout.tags.push({
    x: x - 46,
    y: y + 6,
    text: transistor.gate.toUpperCase(),
    net: transistor.gate,
  });
}

function emptyLayout(): Layout {
  return {
    width: 0,
    railEnd: 0,
    segments: [],
    fets: [],
    dots: [],
    tags: [],
    output: { x: 0, y: 0 },
    stageLabels: [],
  };
}

/** Parallel pMOS from 1, series nMOS to 0. Returns the output point. */
function drawNand(stage: CmosStage, c: number, layout: Layout) {
  const [pA, pB, nA, nB] = stage.transistors;
  const out = stage.output;
  const fets: Placed[] = [
    { transistor: pA, x: c - 44, y: 78 },
    { transistor: pB, x: c + 44, y: 78 },
    { transistor: nA, x: c, y: 180 },
    { transistor: nB, x: c, y: 244 },
  ];
  layout.fets.push(...fets);
  layout.segments.push(
    ...leads(pA, c - 44, 78, VDD_Y, 120),
    ...leads(pB, c + 44, 78, VDD_Y, 120),
    { d: `M${c - 44} 120H${c}`, net: out, via: pA.id },
    { d: `M${c} 120H${c + 44}`, net: out, via: pB.id },
    { d: `M${c} 120V140`, net: out },
    ...leads(nA, c, 180, 140, 212),
    ...leads(nB, c, 244, 212, GND_Y),
  );
  layout.dots.push({ x: c, y: 120, net: out }, { x: c, y: 140, net: out });
  for (const placed of fets) inputStub(placed, layout);
  return { x: c, y: 140 };
}

/** Series pMOS from 1, parallel nMOS to 0. Returns the output point. */
function drawNor(stage: CmosStage, c: number, layout: Layout) {
  const [pA, pB, nA, nB] = stage.transistors;
  const out = stage.output;
  const fets: Placed[] = [
    { transistor: pA, x: c, y: 70 },
    { transistor: pB, x: c, y: 134 },
    { transistor: nA, x: c - 44, y: 236 },
    { transistor: nB, x: c + 44, y: 236 },
  ];
  layout.fets.push(...fets);
  layout.segments.push(
    ...leads(pA, c, 70, VDD_Y, 106),
    ...leads(pB, c, 134, 106, 170),
    { d: `M${c} 170V188`, net: out },
    { d: `M${c} 188H${c - 44}`, net: out, via: nA.id },
    { d: `M${c} 188H${c + 44}`, net: out, via: nB.id },
    ...leads(nA, c - 44, 236, 188, GND_Y),
    ...leads(nB, c + 44, 236, 188, GND_Y),
  );
  layout.dots.push({ x: c, y: 170, net: out }, { x: c, y: 188, net: out });
  for (const placed of fets) inputStub(placed, layout);
  return { x: c, y: 170 };
}

/** One pMOS over one nMOS. A second stage takes its input on a bus from `from`. */
function drawInverter(
  stage: CmosStage,
  c: number,
  layout: Layout,
  from?: { x: number; y: number },
) {
  const [p, n] = stage.transistors;
  const fets: Placed[] = [
    { transistor: p, x: c, y: 100 },
    { transistor: n, x: c, y: 230 },
  ];
  layout.fets.push(...fets);
  layout.segments.push(...leads(p, c, 100, VDD_Y, 165), ...leads(n, c, 230, 165, GND_Y));
  layout.dots.push({ x: c, y: 165, net: stage.output });
  if (!from) {
    for (const placed of fets) inputStub(placed, layout);
  } else {
    const bus = c - 42;
    const net = p.gate;
    layout.segments.push(
      { d: `M${from.x} ${from.y}H${bus}`, net },
      { d: `M${c - 26} 100H${bus}V230H${c - 16}`, net },
    );
    layout.dots.push({ x: bus, y: from.y, net });
    layout.tags.push({ x: (from.x + 44 + bus) / 2, y: from.y - 8, text: "X", net });
  }
  return { x: c, y: 165 };
}

function gateLayout(gate: CmosGate): Layout {
  const layout = emptyLayout();
  const [first, second] = cmosStages(gate);
  const draw = (stage: CmosStage, c: number) =>
    stage.kind === "nand"
      ? drawNand(stage, c, layout)
      : stage.kind === "nor"
        ? drawNor(stage, c, layout)
        : drawInverter(stage, c, layout);
  if (first.kind === "not") {
    layout.output = drawInverter(first, 96, layout);
    layout.railEnd = 126;
  } else {
    layout.output = draw(first, 110);
    layout.railEnd = 184;
  }
  if (second) {
    layout.output = drawInverter(second, 244, layout, layout.output);
    layout.railEnd = 274;
    layout.stageLabels = [
      { x: 110, text: first.kind.toUpperCase() },
      { x: 244, text: "NOT" },
    ];
  }
  const lampX = layout.railEnd + 46;
  layout.segments.push({
    d: `M${layout.output.x} ${layout.output.y}H${lampX - 14}`,
    net: "y",
  });
  layout.output = { x: lampX, y: layout.output.y };
  layout.width = lampX + 20;
  return layout;
}

const LAYOUTS = Object.fromEntries(CMOS_GATES.map((gate) => [gate, gateLayout(gate)])) as Record<
  CmosGate,
  Layout
>;

const level = (value: Bit | null | undefined) =>
  value === null || value === undefined ? "z" : value;

/** Inputs and stage outputs are driven; inside a network a wire is lit on a conducting path. */
function isLit(state: CmosState, segment: Pick<Segment, "net" | "via">) {
  if (segment.via) return state.transistors[segment.via]?.path != null;
  if (segment.net === "a" || segment.net === "b") return true;
  return state.nets[segment.net]?.path != null;
}

function Schematic({ state }: { state: CmosState }) {
  const layout = LAYOUTS[state.gate];
  const shift = Math.round((VIEW_WIDTH - layout.width) / 2);
  const value = (net: string) => level(state.nets[net]?.value);
  const lit = layout.segments.filter((segment) => isLit(state, segment));
  return (
    <svg
      className={styles.schematic}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      role="img"
      aria-label={describeCmos(state)}
    >
      <g transform={`translate(${shift} 0)`}>
        {layout.fets.map(({ transistor, x, y }) => (
          <rect
            key={`box-${transistor.id}`}
            className={styles.fetBox}
            data-on={state.transistors[transistor.id].on}
            data-level={value(transistor.ends[0])}
            x={x - 32}
            y={y - 21}
            width={40}
            height={42}
            rx={6}
          />
        ))}
        <path className={styles.rail} data-level={1} d={`M26 ${VDD_Y}H${layout.railEnd}`} />
        <path className={styles.rail} data-level={0} d={`M26 ${GND_Y}H${layout.railEnd}`} />
        <text className={styles.railValue} data-level={1} x={13} y={VDD_Y + 6}>
          1
        </text>
        <text className={styles.railValue} data-level={0} x={13} y={GND_Y + 6}>
          0
        </text>
        <text className={styles.railName} x={28} y={VDD_Y - 10}>
          VDD
        </text>
        <text className={styles.railName} x={28} y={GND_Y + 20}>
          GND
        </text>
        {lit.map((segment) => (
          <path
            key={`halo-${segment.d}`}
            className={styles.halo}
            data-level={value(segment.net)}
            d={segment.d}
          />
        ))}
        {layout.segments.map((segment) => (
          <path
            key={segment.d}
            className={styles.wire}
            data-level={value(segment.net)}
            data-lit={lit.includes(segment)}
            d={segment.d}
          />
        ))}
        {layout.fets.map(({ transistor, x, y }) => {
          const fet = state.transistors[transistor.id];
          const gate = value(transistor.gate);
          return (
            <g
              key={transistor.id}
              className={styles.fet}
              data-on={fet.on}
              data-lit={fet.path !== null}
              data-level={value(transistor.ends[0])}
            >
              <path className={styles.channel} d={`M${x - 9} ${y - 17}V${y + 17}`} />
              <path
                className={styles.gatePlate}
                data-level={gate}
                d={`M${x - 16} ${y - 14}V${y + 14}`}
              />
              {transistor.channel === "p" && (
                <circle className={styles.bubble} data-level={gate} cx={x - 21} cy={y} r={4.5} />
              )}
            </g>
          );
        })}
        {layout.dots.map((dot) => (
          <circle
            key={`${dot.x}-${dot.y}`}
            className={styles.dot}
            data-level={value(dot.net)}
            data-lit={isLit(state, dot)}
            cx={dot.x}
            cy={dot.y}
            r={4}
          />
        ))}
        {layout.tags.map((tag) => (
          <text
            key={`${tag.x}-${tag.y}`}
            className={styles.tag}
            data-level={value(tag.net)}
            x={tag.x}
            y={tag.y}
            textAnchor={tag.text === "X" ? "middle" : "end"}
          >
            {tag.text}
          </text>
        ))}
        {layout.stageLabels.map((label) => (
          <text
            key={label.text}
            className={styles.railName}
            x={label.x}
            y={GND_Y + 20}
            textAnchor="middle"
          >
            {label.text} STAGE
          </text>
        ))}
        <text
          className={styles.tag}
          data-level={value("y")}
          x={layout.output.x}
          y={layout.output.y - 24}
          textAnchor="middle"
        >
          Y
        </text>
        <g className={styles.lamp} data-on={state.output === 1}>
          <circle className={styles.lampHalo} cx={layout.output.x} cy={layout.output.y} r={22} />
          <circle className={styles.lampBulb} cx={layout.output.x} cy={layout.output.y} r={14} />
          <text
            className={styles.lampValue}
            x={layout.output.x}
            y={layout.output.y + 5}
            textAnchor="middle"
          >
            {state.output ?? "?"}
          </text>
        </g>
      </g>
    </svg>
  );
}

/** A small transistor symbol for the key, drawn like the schematic's. */
function KeySymbol({ channel }: { channel: "p" | "n" }) {
  return (
    <svg className={styles.keySymbol} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M29 4V12H22M22 28H29V36M22 9V31M15 12V28" />
      {channel === "p" ? (
        <>
          <circle cx={10} cy={20} r={4} />
          <path d="M6 20H3" />
        </>
      ) : (
        <path d="M15 20H3" />
      )}
    </svg>
  );
}

const PICKER_LABELS: Record<CmosGate, string> = {
  not: "Show the NOT gate: one pMOS, one nMOS",
  nand: "Show the NAND gate: pMOS in parallel, nMOS in series",
  nor: "Show the NOR gate: pMOS in series, nMOS in parallel",
  and: "Show the AND gate: a NAND stage, then a NOT stage",
  or: "Show the OR gate: a NOR stage, then a NOT stage",
};

/**
 * How each logic gate is wired from pMOS and nMOS transistors, with the
 * conducting path lit for the current inputs. Usable in MDX articles.
 */
export function TransistorGates({
  gate: initialGate = "not",
  fixed = false,
  legend = true,
}: {
  /** The gate shown first. */
  gate?: CmosGate;
  /** Hide the gate picker, to embed one gate per spot. */
  fixed?: boolean;
  /** Show the key under the demo. Turn it off when several gates follow each other. */
  legend?: boolean;
}) {
  const [gate, setGate] = useState<CmosGate>(initialGate);
  const [inputs, setInputs] = useState<{ a: Bit; b: Bit }>({ a: 0, b: 0 });
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const twoInputs = inputCount(gate) === 2;
  const state = cmosState(gate, inputs.a, twoInputs ? inputs.b : 0);
  const explanation = explainCmos(state);
  const rows = truthRows(gate);
  const label = GATE_LABELS[gate];
  const names = twoInputs ? (["a", "b"] as const) : (["a"] as const);

  function pick(next: CmosGate) {
    if (next === gate) return;
    setGate(next);
    playSwitch();
  }

  function flip(name: "a" | "b") {
    setInputs((current) => ({ ...current, [name]: current[name] === 1 ? 0 : 1 }));
    playButton();
  }

  return (
    <DemoMachine
      title="GATE WIRING"
      label="Logic gates wired from transistors"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
    >
      <div className={styles.body}>
        <div className={shared.plate}>
          <div className={clsx(panel.sectionHead, styles.head)}>
            <span>GATE</span>
            {fixed ? (
              <span>{label}</span>
            ) : (
              <fieldset className={styles.picker} aria-label="Gate">
                {CMOS_GATES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={option === gate}
                    aria-label={PICKER_LABELS[option]}
                    onClick={() => pick(option)}
                  >
                    {GATE_LABELS[option]}
                  </button>
                ))}
              </fieldset>
            )}
          </div>
          <div className={styles.screen}>
            <div className={styles.screenTop}>
              <span className={styles.symbol}>
                <GateSymbol type={gate} />
              </span>
              <strong>{label}</strong>
              <span>{BLUEPRINT_RECIPES.transistor[gate].toUpperCase()}</span>
            </div>
            <Schematic state={state} />
            <ul className={styles.explain} aria-live="polite">
              {explanation.flatMap((step) =>
                explanation.length > 1
                  ? [
                      <li key={step.stage}>
                        <b>{step.stage}</b> {step.conducting}
                      </li>,
                    ]
                  : [<li key="conducting">{step.conducting}</li>, <li key="open">{step.open}</li>],
              )}
            </ul>
          </div>
        </div>

        <div className={clsx(shared.plate, styles.controls)}>
          <div>
            <div className={panel.sectionHead}>
              <span>INPUTS</span>
              <span>OUTPUT</span>
            </div>
            <div className={styles.io}>
              {names.map((name) => {
                const bit = inputs[name];
                return (
                  <div className={styles.ioUnit} key={name}>
                    <span className={styles.ioLabel}>{name.toUpperCase()}</span>
                    <button
                      type="button"
                      className={clsx(panel.bitButton, styles.key)}
                      aria-pressed={bit === 1}
                      aria-label={`Input ${name.toUpperCase()}: ${bit}. Flip input.`}
                      onClick={() => flip(name)}
                    >
                      {bit}
                    </button>
                  </div>
                );
              })}
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
              <div className={styles.ioUnit}>
                <span className={styles.ioLabel}>Y</span>
                <output
                  className={styles.outLamp}
                  data-on={state.output === 1}
                  aria-label={`Output Y: ${state.output}`}
                >
                  {state.output}
                </output>
              </div>
            </div>
          </div>
          <div>
            <div className={panel.sectionHead}>
              <span>TRUTH TABLE</span>
            </div>
            <fieldset
              className={styles.table}
              aria-label={`${label} truth table`}
              style={{ "--columns": twoInputs ? 3 : 2 } as CSSProperties}
            >
              <div className={styles.tableHead} aria-hidden="true">
                <span>A</span>
                {twoInputs && <span>B</span>}
                <span>Y</span>
              </div>
              {rows.map((row) => {
                const current = row.a === state.a && (!twoInputs || row.b === state.b);
                return (
                  <button
                    key={`${row.a}${row.b}`}
                    type="button"
                    className={styles.row}
                    aria-current={current ? "true" : undefined}
                    aria-label={`A ${row.a}${twoInputs ? `, B ${row.b}` : ""}: Y is ${row.y}. Set these inputs.`}
                    onClick={() => {
                      setInputs((previous) => ({ a: row.a, b: twoInputs ? row.b : previous.b }));
                      playButton();
                    }}
                  >
                    <span>{row.a}</span>
                    {twoInputs && <span>{row.b}</span>}
                    <span className={styles.rowOut}>{row.y}</span>
                  </button>
                );
              })}
            </fieldset>
          </div>
        </div>

        {legend && (
          <div className={clsx(shared.plate, styles.keyPlate)}>
            <div className={panel.sectionHead}>
              <span>HOW TO READ IT</span>
            </div>
            <ul className={styles.legend}>
              <li>
                <KeySymbol channel="p" />
                <span>
                  <b>pMOS</b> conducts when its input is 0. The bubble marks it.
                </span>
              </li>
              <li>
                <KeySymbol channel="n" />
                <span>
                  <b>nMOS</b> conducts when its input is 1.
                </span>
              </li>
              <li>
                <i className={styles.swatch} data-level="1" aria-hidden="true" />
                <span>Green is 1. The pMOS above Y can connect it to 1.</span>
              </li>
              <li>
                <i className={styles.swatch} data-level="0" aria-hidden="true" />
                <span>Amber is 0. The nMOS below Y can connect it to 0.</span>
              </li>
            </ul>
            <p className={styles.rule}>
              Two transistors in series both have to conduct. Two in parallel need only one.
            </p>
            <p className={styles.rule}>
              For every input, exactly one network conducts, and its path lights up. Y never floats
              and never shorts.
            </p>
          </div>
        )}
      </div>
    </DemoMachine>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import {
  type SwitchLampWiring,
  switchLampDemo,
  transistorLampDemo,
} from "src/lib/computer/demoCircuits";
import { type Circuit, initialSnapshot, type Snapshot, step } from "src/lib/computer/logic";
import { CmosLampBoard } from "./CmosLampBoard";
import {
  Battery,
  Cable,
  type Control,
  GateCharges,
  KnifeSwitch,
  Lamp,
  Resistor,
  Terminal,
} from "./SwitchBoardParts";
import own from "./SwitchLogic.module.css";

export type SwitchWiring = "series" | "parallel";
type ContactKind = "nmos" | "pmos";
type Contact = { name: Control; kind: ContactKind; x: number; y: number };
type Spark = { id: number; x: number; y: number; control?: Control };

const WIRINGS: Record<SwitchLampWiring, string> = {
  single: "ONE SWITCH",
  series: "AND",
  parallel: "OR",
  not: "NOT",
  nand: "NAND",
  nor: "NOR",
  xor: "XOR",
  xnor: "XNOR",
};
const ELECTRICAL_WIRINGS: SwitchLampWiring[] = [
  "single",
  "series",
  "parallel",
  "not",
  "nand",
  "nor",
  "xor",
  "xnor",
];

function contactsFor(wiring: SwitchWiring | "single", kind: ContactKind = "nmos"): Contact[] {
  if (wiring === "single") return [{ name: "A", kind, x: 500, y: 180 }];
  return wiring === "series"
    ? [
        { name: "A", kind: "nmos", x: 330, y: 140 },
        { name: "B", kind: "nmos", x: 510, y: 140 },
      ]
    : [
        // Stacked, halfway between the branch rails at x=180 and x=610.
        { name: "A", kind: "nmos", x: 395, y: 140 },
        { name: "B", kind: "nmos", x: 395, y: 360 },
      ];
}
function conducts(contact: Contact, a: boolean, b: boolean) {
  const high = contact.name === "A" ? a : b;
  return contact.kind === "nmos" ? high : !high;
}
/** What the lamp circuit settles to for these inputs. Current follows the switch at once. */
const settle = (circuit: Circuit, a: boolean, b: boolean) =>
  step(circuit, initialSnapshot(), false, {}, { a, b });

const CHARGE_X = [-30, -15, 0, 15, 30];
const CHANNEL_CHARGES = CHARGE_X.map((x) => [x, 12] as const);
const PLATE_CHARGES = CHARGE_X.map((x) => [x, 26] as const);

/**
 * The package shows why the gate wire is not a loop: the gate plate never touches
 * the channel. It is a capacitor, and the charge it holds opens the channel.
 */
function TransistorSwitch({
  contact,
  high,
  closed,
  active,
  reversed,
  boardHeight,
}: {
  contact: Contact;
  high: boolean;
  closed: boolean;
  active: boolean;
  reversed: boolean;
  boardHeight: number;
}) {
  return (
    <div
      className={own.transistorSwitch}
      style={{ left: `${contact.x / 8}%`, top: `${(contact.y / boardHeight) * 100}%` }}
      role="img"
      aria-label={`${contact.kind.toUpperCase()} ${contact.name} transistor ${closed ? "conducting" : "blocking"}; gate ${high ? "high" : "low"}; gate capacitor ${closed ? "charged" : "empty"}`}
    >
      <svg viewBox="-60 -60 120 120" aria-hidden="true">
        <path className={own.deviceLead} d="M-56 0 H-50 M50 0 H56" />
        <rect className={own.chip} x="-50" y="-44" width="100" height="88" rx="9" />
        <text className={own.chipKind} x="0" y="-18">
          {`${contact.kind.toUpperCase()} ${contact.name}`}
        </text>
        <rect className={own.insulator} x="-38" y="3" width="76" height="31" />
        <GateCharges
          sign={contact.kind === "nmos" ? "minus" : "plus"}
          charged={closed}
          at={CHANNEL_CHARGES}
        />
        <GateCharges
          sign={contact.kind === "nmos" ? "plus" : "minus"}
          charged={closed}
          at={PLATE_CHARGES}
        />
        <path className={own.channel} d="M-50 0 H-38 M38 0 H50" />
        <path className={own.channelBridge} data-closed={closed} d="M-38 0 H38" />
        {active && (
          <>
            <path className={own.currentCable} d={reversed ? "M56 0 H-56" : "M-56 0 H56"} />
            <path className={own.currentFlow} d={reversed ? "M56 0 H-56" : "M-56 0 H56"} />
          </>
        )}
        <path className={own.gatePlate} data-high={high} d="M-38 36 H38 M0 36 V60" />
        <text className={own.gateLabel} x="8" y="56">
          G
        </text>
      </svg>
    </div>
  );
}

function SwitchBoard({
  kind = "nmos",
  wiring,
  a,
  b,
  lit,
  electrical,
  spark,
  snapshot,
  onFlip,
}: {
  kind?: ContactKind;
  wiring: SwitchWiring | "single";
  a: boolean;
  b: boolean;
  lit: boolean;
  electrical: boolean;
  spark: Spark | null;
  snapshot: Snapshot;
  onFlip: (name: Control) => void;
}) {
  const gateHigh = Boolean(snapshot.values.a);
  const contacts = contactsFor(wiring, kind);
  const branched = wiring === "parallel";
  // A real N-channel lamp switch belongs on the return side of the load.
  const lowSide = electrical && contacts.every((contact) => contact.kind === "nmos");
  const rows = branched ? [140, 360] : electrical ? [180] : [140];
  const boardHeight = branched ? 480 : electrical ? 400 : 360;
  const returnY = boardHeight - 30;
  const pullDownY = lowSide ? 360 : returnY;
  // The native simulator decides which complete branches conduct. These are
  // presentation paths, not a second circuit or current simulation.
  const activeRows = rows.map((y, branch) => {
    const last = contacts.filter((contact) => contact.y === y).length - 1;
    return Boolean(snapshot.values[`path-${branch}-${last}`]);
  });
  return (
    <div className={own.boardFrame}>
      <section
        className={own.boardViewport}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Scrollable diagrams need keyboard access.
        tabIndex={0}
        aria-label="Circuit board, scroll sideways on small screens"
      >
        <div
          className={own.board}
          style={{ aspectRatio: `800 / ${boardHeight}` }}
          role="group"
          aria-label={
            electrical
              ? "Electrically controlled switches and a lamp"
              : "Physical switches and a lamp"
          }
        >
          <svg className={own.cables} viewBox={`0 0 800 ${boardHeight}`} aria-hidden="true">
            {lowSide ? (
              <>
                <Cable d="M80 182 V40 H760 V250 H724" active={lit} />
                <Cable d="M676 250 H610" returning active={lit} />
                <Cable d="M180 360 H80 V318" returning active={lit} />
              </>
            ) : (
              <>
                <Cable d="M80 182 V140 H180" active={lit} />
                <Cable d="M610 250 H676" active={lit} />
                <Cable d={`M724 250 H760 V${returnY} H80 V318`} returning active={lit} />
              </>
            )}
            {/* Each half of a branch rail carries current only for its own path. */}
            <Cable d={`M180 ${rows[0]} V${branched || lowSide ? 360 : 140}`} returning={lowSide} />
            <Cable d={`M610 ${rows[0]} V${branched ? 360 : 250}`} returning={lowSide} />
            {rows.map((y, branch) => {
              const row = contacts.filter((contact) => contact.y === y);
              const active = activeRows[branch];
              const ends = [
                180,
                ...row.flatMap((contact) => [contact.x - 56, contact.x + 56]),
                610,
              ];
              return (
                <g key={y} data-branch={branch} data-conducting={active}>
                  {Array.from({ length: row.length + 1 }, (_, index) => {
                    const left = ends[index * 2];
                    const right = ends[index * 2 + 1];
                    return (
                      <Cable
                        key={left}
                        d={lowSide ? `M${right} ${y} H${left}` : `M${left} ${y} H${right}`}
                        returning={lowSide}
                        active={active}
                      />
                    );
                  })}
                  {active && (
                    <>
                      <Cable
                        d={lowSide ? `M180 ${y} V360` : `M180 140 V${y}`}
                        returning={lowSide}
                        active
                      />
                      <Cable
                        d={lowSide ? `M610 250 V${y}` : `M610 ${y} V250`}
                        returning={lowSide}
                        active
                      />
                    </>
                  )}
                </g>
              );
            })}
            {electrical && (
              <>
                <Cable
                  d={lowSide ? "M132 40 V280 H174 Q180 274 186 280 H224" : "M132 140 V280 H224"}
                />
                <Cable d="M336 280 H500 V240" signal high={gateHigh} />
                {/* The pull-down: it empties the gate once the switch opens. */}
                <Cable d="M420 280 V300" signal high={gateHigh} />
                <Cable d={`M420 340 V${pullDownY}`} returning />
                {lowSide && <Cable d="M180 360 H420" returning />}
                <Resistor x={420} y={320} />
                <Terminal x={132} y={lowSide ? 40 : 140} junction />
                <Terminal x={420} y={280} junction />
                <Terminal x={420} y={pullDownY} junction />
                <Terminal x={224} y={280} />
                <Terminal x={336} y={280} />
                <Terminal x={500} y={240} />
              </>
            )}
            {contacts.map((contact) => (
              <g key={`${contact.name}-${contact.kind}-${contact.y}`}>
                <Terminal x={contact.x - 56} y={contact.y} />
                <Terminal x={contact.x + 56} y={contact.y} />
              </g>
            ))}
            <Terminal x={80} y={182} />
            <Terminal x={80} y={318} />
            {branched &&
              rows.map((y) => (
                <g key={y}>
                  <Terminal x={180} y={y} junction />
                  <Terminal x={610} y={y} junction />
                </g>
              ))}
            {branched && <Terminal x={610} y={250} junction />}
          </svg>
          <Battery y={190} boardHeight={boardHeight} />
          {contacts.map((contact) =>
            electrical ? (
              <TransistorSwitch
                key={`${contact.name}-${contact.kind}-${contact.y}`}
                contact={contact}
                high={gateHigh}
                closed={conducts(contact, gateHigh, b)}
                active={activeRows[rows.indexOf(contact.y)]}
                reversed={lowSide}
                boardHeight={boardHeight}
              />
            ) : (
              <KnifeSwitch
                key={`${contact.name}-${contact.kind}-${contact.y}`}
                name={contact.name}
                x={contact.x}
                y={contact.y}
                closed={contact.name === "A" ? a : b}
                active={activeRows[rows.indexOf(contact.y)]}
                boardHeight={boardHeight}
                onFlip={() => onFlip(contact.name)}
              />
            ),
          )}
          {electrical && (
            <KnifeSwitch
              name="A"
              x={280}
              y={280}
              closed={a}
              control
              boardHeight={boardHeight}
              onFlip={() => onFlip("A")}
            />
          )}
          {spark && lit && (
            <span
              key={spark.id}
              className={own.sparkBurst}
              style={{ left: `${spark.x / 8}%`, top: `${(spark.y / boardHeight) * 100}%` }}
              data-testid="switch-spark"
              aria-hidden="true"
            >
              {Array.from({ length: 7 }, (_, index) => (
                <i key={index} />
              ))}
            </span>
          )}
          <Lamp lit={lit} y={119.2} boardHeight={boardHeight} />
        </div>
      </section>
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
/** Voltage-controlled contacts introduce transistor paths before the editable gate builder. */
export function TransistorSwitches({
  wiring = "single",
  fixed = false,
}: {
  wiring?: SwitchLampWiring;
  fixed?: boolean;
}) {
  return <SwitchExperiment wiring={wiring} fixed={fixed} electrical />;
}
/** Opposite gate responses, using two independent native single-transistor circuits. */
export function TransistorComparison() {
  return (
    <section className={own.experiment} aria-label="Compare PMOS and NMOS">
      <div className={own.comparisonStack}>
        <TransistorComparisonHalf kind="pmos" />
        <TransistorComparisonHalf kind="nmos" />
      </div>
    </section>
  );
}

function TransistorComparisonHalf({ kind }: { kind: ContactKind }) {
  const [high, setHigh] = useState(false);
  const circuit = useMemo(() => transistorLampDemo("single", kind), [kind]);
  const snapshot = settle(circuit, high, false);
  const lit = Boolean(snapshot.values.lamp);
  return (
    <section className={own.comparisonHalf} aria-label={`${kind.toUpperCase()} lamp circuit`}>
      <SwitchBoard
        kind={kind}
        wiring="single"
        a={high}
        b={false}
        lit={lit}
        electrical
        spark={null}
        snapshot={snapshot}
        onFlip={() => {
          setHigh((value) => !value);
        }}
      />
      <p className={own.flowStatus} role="status">
        {`A = ${Number(high)} · gate ${lit ? "charged" : "empty"} · lamp ${lit ? "on" : "off"}`}
      </p>
    </section>
  );
}

function SwitchExperiment({
  wiring: initialWiring = "series",
  fixed = false,
  electrical = false,
}: {
  wiring?: SwitchLampWiring;
  electrical?: boolean;
  fixed?: boolean;
}) {
  const [wiring, setWiring] = useState<SwitchLampWiring>(initialWiring);
  const [inputs, setInputs] = useState<[boolean, boolean]>([false, false]);
  const [spark, setSpark] = useState<Spark | null>(null);
  const sparkId = useRef(0);
  const [a, b] = inputs;
  const physicalWiring =
    wiring === "single" ? "single" : wiring === "parallel" ? "parallel" : "series";
  const circuit = useMemo(
    () => (electrical ? transistorLampDemo(wiring) : switchLampDemo(physicalWiring)),
    [wiring, physicalWiring, electrical],
  );
  const output = electrical && wiring !== "single" ? "out" : "lamp";
  const snapshot = settle(circuit, a, b);
  const lit = Boolean(snapshot.values[output]);
  useEffect(() => {
    if (!spark) return;
    const timer = window.setTimeout(() => setSpark(null), 600);
    return () => window.clearTimeout(timer);
  }, [spark]);
  function flip(name: Control) {
    const nextA = name === "A" ? !a : a;
    const nextB = name === "B" ? !b : b;
    const nextLit = settle(circuit, nextA, nextB).values[output];
    const closing = contactsFor(physicalWiring).find(
      (contact) =>
        contact.name === name && !conducts(contact, a, b) && conducts(contact, nextA, nextB),
    );
    setSpark(
      !lit && nextLit
        ? electrical && wiring !== "single"
          ? {
              id: ++sparkId.current,
              x: (name === "A" ? 240 : 400) + ((name === "A" ? nextA : nextB) ? 32 : -32),
              y: 620,
              control: name,
            }
          : closing
            ? { id: ++sparkId.current, x: closing.x + 56, y: closing.y }
            : null
        : null,
    );
    setInputs([nextA, nextB]);
  }
  function rewire(next: SwitchLampWiring) {
    if (next === wiring) return;
    setWiring(next);
    setInputs([false, false]);
    setSpark(null);
  }
  function wiringLabel(name: SwitchLampWiring) {
    return electrical ? WIRINGS[name] : name === "series" ? "IN A ROW" : "SIDE BY SIDE";
  }
  return (
    <section
      className={own.experiment}
      aria-label={electrical ? "Transistors and a lamp" : "Switches and a lamp"}
    >
      {!electrical && (
        <div className={own.header}>
          <div>
            <h3>Switches and a lamp</h3>
          </div>
        </div>
      )}
      {!fixed && (
        <div className={own.wiring} role="group" aria-label="How the switches are wired">
          {(electrical ? ELECTRICAL_WIRINGS : (["series", "parallel"] as SwitchLampWiring[])).map(
            (name) => (
              <button
                type="button"
                key={name}
                aria-pressed={wiring === name}
                onClick={() => rewire(name)}
              >
                {wiringLabel(name)}
              </button>
            ),
          )}
        </div>
      )}
      {fixed && <p className={own.fixedWiring}>{wiringLabel(wiring)}</p>}
      {electrical && wiring !== "single" ? (
        <CmosLampBoard
          circuit={circuit}
          snapshot={snapshot}
          a={a}
          b={b}
          onFlip={flip}
          spark={spark}
        />
      ) : (
        <SwitchBoard
          wiring={physicalWiring}
          a={a}
          b={b}
          lit={lit}
          electrical={electrical}
          spark={spark}
          snapshot={snapshot}
          onFlip={flip}
        />
      )}
      <p className={own.flowStatus} role="status">
        {electrical
          ? wiring === "single"
            ? `A = ${Number(a)} · gate ${lit ? "charged" : "empty"} · lamp ${lit ? "on" : "off"}`
            : `OUT · ${lit ? 1 : 0} · lamp ${lit ? "on" : "off"}`
          : lit
            ? "Complete path · lamp on"
            : "Broken path · lamp off"}
      </p>
    </section>
  );
}

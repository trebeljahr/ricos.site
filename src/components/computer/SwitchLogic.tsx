import { useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { gateReferenceUrl } from "src/lib/computer/cmosGates";
import {
  lampGate,
  type SwitchLampWiring,
  switchLampDemo,
  transistorLampDemo,
} from "src/lib/computer/demoCircuits";
import { initialSnapshot, type Snapshot, step } from "src/lib/computer/logic";
import { CmosLampBoard } from "./CmosLampBoard";
import { Battery, Cable, type Control, KnifeSwitch, Lamp, Terminal } from "./SwitchBoardParts";
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
        { name: "A", kind: "nmos", x: 330, y: 140 },
        { name: "B", kind: "nmos", x: 510, y: 360 },
      ];
}
function conducts(contact: Contact, a: boolean, b: boolean) {
  const high = contact.name === "A" ? a : b;
  return contact.kind === "nmos" ? high : !high;
}

/** Transistors retain their package drawing; only the separate controls are switches. */
function TransistorSwitch({
  contact,
  high,
  closed,
  boardHeight,
}: {
  contact: Contact;
  high: boolean;
  closed: boolean;
  boardHeight: number;
}) {
  return (
    <div
      className={own.transistorSwitch}
      style={{ left: `${contact.x / 8}%`, top: `${(contact.y / boardHeight) * 100}%` }}
      role="img"
      aria-label={`${contact.kind.toUpperCase()} ${contact.name} transistor ${closed ? "conducting" : "blocking"}; gate ${high ? "high" : "low"}`}
    >
      <svg viewBox="-60 -60 120 120" aria-hidden="true">
        <path className={own.deviceLead} d="M-56 0 H-32 M32 0 H56 M0 24 V60" />
        <rect className={own.chip} x="-36" y="-34" width="72" height="62" rx="9" />
        <text className={own.chipKind} x="0" y="-11">
          {contact.kind.toUpperCase()}
        </text>
        <text className={own.chipName} x="0" y="12">
          {contact.name}
        </text>
        <circle className={own.stateLight} data-on={closed} cx="24" cy="-23" r="3" />
        <text className={own.gateLabel} x="10" y="55">
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
  const contacts = contactsFor(wiring, kind);
  const branched = wiring === "parallel";
  // A real N-channel lamp switch belongs on the return side of the load.
  const lowSide = electrical && contacts.every((contact) => contact.kind === "nmos");
  const rows = branched ? [140, 360] : electrical ? [180] : [140];
  const boardHeight = branched ? 480 : electrical ? 400 : 360;
  const returnY = boardHeight - 30;
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
                      <path
                        className={own.flowArrow}
                        d={`M${lowSide ? 200 : 590} ${y} l${lowSide ? 8 : -8} -5 m${lowSide ? -8 : 8} 5 l${lowSide ? 8 : -8} 5`}
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
                <Cable d="M336 280 H500 V240" signal high={a} />
                <Terminal x={132} y={lowSide ? 40 : 140} junction />
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
                high={contact.name === "A" ? a : b}
                closed={conducts(contact, a, b)}
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
          {spark && (
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
  const { soundEnabled, toggleSound, playSwitch } = usePanelSound();
  return (
    <section className={own.experiment} aria-label="Compare PMOS and NMOS">
      <div className={own.header}>
        <h3>PMOS and NMOS</h3>
        <button
          type="button"
          className={own.sound}
          aria-pressed={soundEnabled}
          onClick={toggleSound}
        >
          SOUND {soundEnabled ? "ON" : "OFF"}
        </button>
      </div>
      <p className={own.comparisonIntro}>
        Start with both inputs at 0. Close each switch to change its input to 1.
      </p>
      <div
        className={own.comparisonViewport}
        role="group"
        aria-label="PMOS and NMOS circuits, scroll sideways on small screens"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Side-by-side circuits support keyboard scrolling.
        tabIndex={0}
      >
        <div className={own.comparisonColumns}>
          <TransistorComparisonHalf kind="pmos" onFlip={playSwitch} />
          <TransistorComparisonHalf kind="nmos" onFlip={playSwitch} />
        </div>
      </div>
      <p className={own.comparisonScrollHint}>Scroll sideways to compare both circuits.</p>
      <p className={own.flowLegend}>
        Input 0: PMOS conducts, NMOS blocks. Input 1: PMOS blocks, NMOS conducts. In this simplified
        demo, an open switch means input 0. Moving dots show current through the lamp.
      </p>
    </section>
  );
}

function TransistorComparisonHalf({ kind, onFlip }: { kind: ContactKind; onFlip: () => void }) {
  const [high, setHigh] = useState(false);
  const circuit = useMemo(() => transistorLampDemo("single", kind), [kind]);
  const snapshot = useMemo(
    () => step(circuit, initialSnapshot(), false, {}, { a: high }),
    [circuit, high],
  );
  const lit = Boolean(snapshot.values.lamp);
  return (
    <section className={own.comparisonHalf} aria-label={`${kind.toUpperCase()} lamp circuit`}>
      <h4>{kind.toUpperCase()}</h4>
      <p className={own.comparisonCaption}>
        {kind === "pmos" ? "On at input 0" : "Off at input 0"}
      </p>
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
          onFlip();
        }}
      />
      <p className={own.flowStatus} role="status">
        {`Input ${Number(high)} · ${lit ? "conducting · lamp on" : "blocking · lamp off"}`}
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
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const [a, b] = inputs;
  const physicalWiring =
    wiring === "single" ? "single" : wiring === "parallel" ? "parallel" : "series";
  const circuit = useMemo(
    () => (electrical ? transistorLampDemo(wiring) : switchLampDemo(physicalWiring)),
    [wiring, physicalWiring, electrical],
  );
  const output = electrical && wiring !== "single" ? "out" : "lamp";
  const snapshot = useMemo(
    () => step(circuit, initialSnapshot(), false, {}, { a, b }),
    [circuit, a, b],
  );
  const lit = Boolean(snapshot.values[output]);
  useEffect(() => {
    if (!spark) return;
    const timer = window.setTimeout(() => setSpark(null), 600);
    return () => window.clearTimeout(timer);
  }, [spark]);
  function flip(name: Control) {
    const nextA = name === "A" ? !a : a;
    const nextB = name === "B" ? !b : b;
    const nextLit = step(circuit, initialSnapshot(), false, {}, { a: nextA, b: nextB }).values[
      output
    ];
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
    playSwitch();
  }
  function rewire(next: SwitchLampWiring) {
    if (next === wiring) return;
    setWiring(next);
    setInputs([false, false]);
    setSpark(null);
    playButton();
  }
  function wiringLabel(name: SwitchLampWiring) {
    return electrical ? WIRINGS[name] : name === "series" ? "IN A ROW" : "SIDE BY SIDE";
  }
  return (
    <section
      className={own.experiment}
      aria-label={electrical ? "Transistors and a lamp" : "Switches and a lamp"}
    >
      <div className={own.header}>
        <div>
          <h3>{electrical ? "Switches controlled by electricity" : "Switches and a lamp"}</h3>
        </div>
        <button
          type="button"
          className={own.sound}
          aria-pressed={soundEnabled}
          onClick={toggleSound}
        >
          SOUND {soundEnabled ? "ON" : "OFF"}
        </button>
      </div>
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
      {electrical && wiring !== "single" && (
        <p className={own.flowLegend}>
          {circuit.nodes.filter((node) => node.type === "pmos" || node.type === "nmos").length}{" "}
          transistors.{" "}
          <a className="underline" href={gateReferenceUrl(lampGate(wiring)!)}>
            Video wiring
          </a>
          .{wiring === "xnor" && " XNOR adds a two-transistor NOT to the video's XOR."}
          {(wiring === "xor" || wiring === "xnor") &&
            " Ideal pass switches; real output-voltage loss is not modeled."}
        </p>
      )}
      <p className={own.flowStatus} role="status">
        {electrical && wiring !== "single"
          ? `OUT · ${lit ? 1 : 0} · lamp ${lit ? "on" : "off"}`
          : lit
            ? "Complete path · lamp on"
            : "Broken path · lamp off"}
      </p>
      <p className={own.flowLegend}>
        Moving dots follow current from +, through the lamp, back to −.
        {electrical &&
          " The same knife switches feed A and B from the battery. In this demo, open inputs are 0; thin wires carry the input levels to the transistors."}
      </p>
    </section>
  );
}

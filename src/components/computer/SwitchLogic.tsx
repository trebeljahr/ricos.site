import { useEffect, useId, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { type SwitchLampWiring, switchLampDemo } from "src/lib/computer/demoCircuits";
import { bit } from "src/lib/computer/gateLogic";
import { initialSnapshot, step } from "src/lib/computer/logic";
import own from "./SwitchLogic.module.css";

export type SwitchWiring = "series" | "parallel";
type Control = "A" | "B";
type ContactKind = "nmos" | "pmos";
type Contact = { name: Control; kind: ContactKind; x: number; y: number };
type Spark = { id: number; x: number; y: number };

const WIRINGS: Record<SwitchLampWiring, string> = {
  single: "ONE SWITCH",
  series: "IN A ROW · AND",
  parallel: "SIDE BY SIDE · OR",
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

function contactsFor(wiring: SwitchLampWiring): Contact[] {
  switch (wiring) {
    case "single":
      return [{ name: "A", kind: "nmos", x: 410, y: 180 }];
    case "not":
      return [{ name: "A", kind: "pmos", x: 410, y: 180 }];
    case "series":
      return [
        { name: "A", kind: "nmos", x: 320, y: 180 },
        { name: "B", kind: "nmos", x: 500, y: 180 },
      ];
    case "nor":
      return [
        { name: "A", kind: "pmos", x: 320, y: 180 },
        { name: "B", kind: "pmos", x: 500, y: 180 },
      ];
    case "parallel":
      return [
        { name: "A", kind: "nmos", x: 410, y: 145 },
        { name: "B", kind: "nmos", x: 410, y: 285 },
      ];
    case "nand":
      return [
        { name: "A", kind: "pmos", x: 410, y: 145 },
        { name: "B", kind: "pmos", x: 410, y: 285 },
      ];
    case "xor":
      return [
        { name: "A", kind: "nmos", x: 320, y: 145 },
        { name: "B", kind: "pmos", x: 500, y: 145 },
        { name: "A", kind: "pmos", x: 320, y: 285 },
        { name: "B", kind: "nmos", x: 500, y: 285 },
      ];
    case "xnor":
      return [
        { name: "A", kind: "nmos", x: 320, y: 145 },
        { name: "B", kind: "nmos", x: 500, y: 145 },
        { name: "A", kind: "pmos", x: 320, y: 285 },
        { name: "B", kind: "pmos", x: 500, y: 285 },
      ];
  }
}
function conducts(contact: Contact, a: boolean, b: boolean) {
  const high = contact.name === "A" ? a : b;
  return contact.kind === "nmos" ? high : !high;
}

function KnifeSwitch({
  contact,
  closed,
  onFlip,
}: {
  contact: Contact;
  closed: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      className={own.knifeSwitch}
      style={{ left: `${contact.x / 8}%`, top: `${contact.y / 5.6}%` }}
      aria-pressed={closed}
      aria-label={`Switch ${contact.name}: ${closed ? "closed" : "open"}. Click to ${closed ? "open" : "close"}.`}
      onClick={onFlip}
    >
      <span className={own.switchBase} aria-hidden="true">
        <i className={own.contactLeft} />
        <i className={own.contactRight} />
        <span className={own.blade} data-closed={closed}>
          <i />
        </span>
      </span>
    </button>
  );
}
/** Packages show state; only the separate battery-fed selector switches change it. */
function TransistorSwitch({
  contact,
  high,
  closed,
}: {
  contact: Contact;
  high: boolean;
  closed: boolean;
}) {
  return (
    <div
      className={own.transistorSwitch}
      style={{ left: `${contact.x / 8}%`, top: `${contact.y / 5.6}%` }}
      role="img"
      aria-label={`${contact.kind.toUpperCase()} ${contact.name} transistor ${closed ? "conducting" : "blocking"}; gate ${high ? "high" : "low"}`}
    >
      <svg viewBox="-60 -45 120 100" aria-hidden="true">
        <path className={own.deviceLead} d="M-56 0 H-32 M32 0 H56 M0 24 V48" />
        <rect className={own.chip} x="-36" y="-34" width="72" height="62" rx="9" />
        <text className={own.chipKind} x="0" y="-11">
          {contact.kind.toUpperCase()}
        </text>
        <text className={own.chipName} x="0" y="12">
          {contact.name}
        </text>
        <circle className={own.stateLight} data-on={closed} cx="24" cy="-23" r="3" />
        <text className={own.gateLabel} x="10" y="43">
          G
        </text>
      </svg>
    </div>
  );
}

/** SPDT: the common terminal always selects one of the battery's two rails. */
function ControlSwitch({
  name,
  x,
  high,
  onFlip,
}: {
  name: Control;
  x: number;
  high: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      className={own.controlSwitch}
      style={{ left: `${x / 8}%` }}
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

function Cable({
  d,
  returning = false,
  signal = false,
  high = false,
}: {
  d: string;
  returning?: boolean;
  signal?: boolean;
  high?: boolean;
}) {
  return (
    <g data-signal={signal || undefined} data-high={signal ? high : undefined}>
      <path d={d} className={own.cableSleeve} />
      <path d={d} className={signal ? own.signalCable : returning ? own.returnCable : own.cable} />
    </g>
  );
}
function Terminal({ x, y, junction = false }: { x: number; y: number; junction?: boolean }) {
  return (
    <circle className={junction ? own.junction : own.terminal} cx={x} cy={y} r={junction ? 4 : 5} />
  );
}

function SwitchBoard({
  wiring,
  a,
  b,
  lit,
  electrical,
  spark,
  onFlip,
}: {
  wiring: SwitchLampWiring;
  a: boolean;
  b: boolean;
  lit: boolean;
  electrical: boolean;
  spark: Spark | null;
  onFlip: (name: Control) => void;
}) {
  const patternId = useId();
  const contacts = contactsFor(wiring);
  const branched = ["parallel", "nand", "xor", "xnor"].includes(wiring);
  // A real N-channel lamp switch belongs on the return side of the load.
  const lowSide = electrical && contacts.every((contact) => contact.kind === "nmos");
  const rows = branched ? [145, 285] : [180];
  const controls: Control[] = contacts.some((contact) => contact.name === "B") ? ["A", "B"] : ["A"];
  const controlX = (name: Control) => (controls.length === 1 ? 410 : name === "A" ? 320 : 500);
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
          role="group"
          aria-label={
            electrical
              ? "Electrically controlled switches and a lamp"
              : "Physical switches and a lamp"
          }
        >
          <svg className={own.cables} viewBox="0 0 800 560" aria-hidden="true">
            <defs>
              <pattern id={patternId} width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.7" fill="#c6c5b9" />
              </pattern>
            </defs>
            <rect x="130" y="90" width="630" height="350" rx="8" fill={`url(#${patternId})`} />
            {electrical ? (
              <>
                <Cable d={`M80 212 V56 H${lowSide ? 650 : 180}`} />
                <Cable
                  d={`M80 348 V512 H${lowSide ? controlX(controls[controls.length - 1]) - 32 : 776}`}
                  returning
                />
                <Cable d={`M150 56 V475 H${controlX(controls[controls.length - 1]) + 32}`} />
                <Cable
                  d={lowSide ? `M180 512 V${rows[0]}` : `M180 56 V${rows[rows.length - 1]}`}
                  returning={lowSide}
                />
              </>
            ) : (
              <>
                <Cable d={`M80 212 V${rows[0]} H180 V${rows[rows.length - 1]}`} />
                <Cable d="M80 348 V430 H776 V360 H724" returning />
              </>
            )}
            {rows.map((y) => {
              const row = contacts.filter((contact) => contact.y === y);
              return (
                <g key={y}>
                  <Cable d={`M180 ${y} H${row[0].x - 56}`} returning={lowSide} />
                  {row.length === 2 && (
                    <Cable d={`M${row[0].x + 56} ${y} H${row[1].x - 56}`} returning={lowSide} />
                  )}
                  <Cable d={`M${row[row.length - 1].x + 56} ${y} H610`} returning={lowSide} />
                  {branched && (
                    <>
                      <Terminal x={180} y={y} junction />
                      <Terminal x={610} y={y} junction />
                    </>
                  )}
                </g>
              );
            })}
            {lowSide ? (
              <>
                <Cable d={`M610 ${rows[0]} V390 H776 V360 H724`} returning />
                <Cable d="M676 360 H650 V56" />
                <Terminal x={650} y={56} junction />
              </>
            ) : (
              <>
                <Cable d={`M610 ${rows[0]} V360 H676`} />
                {electrical && <Cable d="M724 360 H776 V512" returning />}
              </>
            )}
            {electrical && <Terminal x={180} y={lowSide ? 512 : 56} junction />}
            {electrical && (
              <>
                <Terminal x={150} y={56} junction />
                {controls.map((name) => {
                  const x = controlX(name);
                  const high = name === "A" ? a : b;
                  const gates = contacts.filter((contact) => contact.name === name);
                  const lane = name === "A" ? 230 : 580;
                  const top = gates[0].y + 48;
                  return (
                    <g key={name}>
                      <Cable d={`M${x - 32} 445 V512`} returning />
                      <Cable d={`M${x + 32} 445 V475`} />
                      <Terminal x={x - 32} y={512} junction />
                      <Terminal x={x + 32} y={475} junction />
                      <Cable d={`M${x} 385 H${lane} V${top} H${gates[0].x}`} signal high={high} />
                      {gates.slice(1).map((contact) => (
                        <g key={contact.y}>
                          <Cable
                            d={`M${lane} ${contact.y + 48} H${contact.x}`}
                            signal
                            high={high}
                          />
                          <Terminal x={lane} y={contact.y + 48} junction />
                        </g>
                      ))}
                      {gates.map((contact) => (
                        <Terminal key={contact.y} x={contact.x} y={contact.y + 48} />
                      ))}
                    </g>
                  );
                })}
              </>
            )}
            {contacts.map((contact) => (
              <g key={`${contact.name}-${contact.kind}-${contact.y}`}>
                <Terminal x={contact.x - 56} y={contact.y} />
                <Terminal x={contact.x + 56} y={contact.y} />
              </g>
            ))}
            <Terminal x={80} y={212} />
            <Terminal x={80} y={348} />
          </svg>
          <div className={own.battery} role="img" aria-label="Battery">
            <i />
            <span className={own.batteryPositive}>+</span>
            <span className={own.batteryNegative}>−</span>
          </div>
          {contacts.map((contact) =>
            electrical ? (
              <TransistorSwitch
                key={`${contact.name}-${contact.kind}-${contact.y}`}
                contact={contact}
                high={contact.name === "A" ? a : b}
                closed={conducts(contact, a, b)}
              />
            ) : (
              <KnifeSwitch
                key={`${contact.name}-${contact.kind}-${contact.y}`}
                contact={contact}
                closed={contact.name === "A" ? a : b}
                onFlip={() => onFlip(contact.name)}
              />
            ),
          )}
          {electrical &&
            controls.map((name) => (
              <ControlSwitch
                key={name}
                name={name}
                x={controlX(name)}
                high={name === "A" ? a : b}
                onFlip={() => onFlip(name)}
              />
            ))}
          {spark && (
            <span
              key={spark.id}
              className={own.sparkBurst}
              style={{ left: `${spark.x / 8}%`, top: `${spark.y / 5.6}%` }}
              data-testid="switch-spark"
              aria-hidden="true"
            >
              {Array.from({ length: 7 }, (_, index) => (
                <i key={index} />
              ))}
            </span>
          )}
          <div
            className={own.lamp}
            data-on={lit}
            role="img"
            aria-label={`Output LAMP: ${bit(lit)}`}
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
  const circuit = useMemo(() => switchLampDemo(wiring), [wiring]);
  const lit = useMemo(
    () => step(circuit, initialSnapshot(), false, {}, { a, b }).values.lamp,
    [circuit, a, b],
  );
  useEffect(() => {
    if (!spark) return;
    const timer = window.setTimeout(() => setSpark(null), 600);
    return () => window.clearTimeout(timer);
  }, [spark]);
  function flip(name: Control) {
    const nextA = name === "A" ? !a : a;
    const nextB = name === "B" ? !b : b;
    const nextLit = step(circuit, initialSnapshot(), false, {}, { a: nextA, b: nextB }).values.lamp;
    const closing = contactsFor(wiring).find(
      (contact) =>
        contact.name === name && !conducts(contact, a, b) && conducts(contact, nextA, nextB),
    );
    setSpark(
      !lit && nextLit && closing
        ? { id: ++sparkId.current, x: closing.x + 56, y: closing.y }
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
      <SwitchBoard
        wiring={wiring}
        a={a}
        b={b}
        lit={lit}
        electrical={electrical}
        spark={spark}
        onFlip={flip}
      />
    </section>
  );
}

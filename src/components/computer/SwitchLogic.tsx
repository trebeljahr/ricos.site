import { useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import { switchLampDemo, type SwitchLampWiring } from "src/lib/computer/demoCircuits";
import { bit } from "src/lib/computer/gateLogic";
import { initialSnapshot, step } from "src/lib/computer/logic";
import own from "./SwitchLogic.module.css";

export type SwitchWiring = "series" | "parallel";
type Control = "A" | "B";
type ContactKind = "nmos" | "pmos";
type Contact = { name: Control; kind: ContactKind; x: number; y: number };
type Spark = { id: number; x: number; y: number };

const WIRINGS: Record<SwitchLampWiring, { label: string; path: string }> = {
  single: { label: "ONE SWITCH", path: "One transistor opens or closes the path to the lamp." },
  series: {
    label: "IN A ROW · AND",
    path: "One path passes through A and then B. Both must conduct.",
  },
  parallel: {
    label: "SIDE BY SIDE · OR",
    path: "Two paths reach the lamp. Either switch can complete one.",
  },
  not: { label: "NOT", path: "A PMOS transistor conducts when A is low, reversing the result." },
  nand: {
    label: "NAND",
    path: "Either low control completes a PMOS path. Only two highs keep the lamp off.",
  },
  nor: { label: "NOR", path: "Two PMOS transistors sit in a row. Both controls must be low." },
  xor: { label: "XOR", path: "One path takes high A and low B; the other takes low A and high B." },
  xnor: { label: "XNOR", path: "One path takes two highs; the other takes two lows." },
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
      return [{ name: "A", kind: "nmos", x: 295, y: 135 }];
    case "not":
      return [{ name: "A", kind: "pmos", x: 295, y: 135 }];
    case "series":
      return [
        { name: "A", kind: "nmos", x: 210, y: 135 },
        { name: "B", kind: "nmos", x: 385, y: 135 },
      ];
    case "nor":
      return [
        { name: "A", kind: "pmos", x: 210, y: 135 },
        { name: "B", kind: "pmos", x: 385, y: 135 },
      ];
    case "parallel":
      return [
        { name: "A", kind: "nmos", x: 295, y: 95 },
        { name: "B", kind: "nmos", x: 295, y: 245 },
      ];
    case "nand":
      return [
        { name: "A", kind: "pmos", x: 295, y: 95 },
        { name: "B", kind: "pmos", x: 295, y: 245 },
      ];
    case "xor":
      return [
        { name: "A", kind: "nmos", x: 210, y: 95 },
        { name: "B", kind: "pmos", x: 385, y: 95 },
        { name: "A", kind: "pmos", x: 210, y: 245 },
        { name: "B", kind: "nmos", x: 385, y: 245 },
      ];
    case "xnor":
      return [
        { name: "A", kind: "nmos", x: 210, y: 95 },
        { name: "B", kind: "nmos", x: 385, y: 95 },
        { name: "A", kind: "pmos", x: 210, y: 245 },
        { name: "B", kind: "pmos", x: 385, y: 245 },
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
      style={{ left: `${contact.x / 6}%`, top: `${contact.y / 4.2}%` }}
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
      <span className={own.switchLabel}>
        {contact.name} · {closed ? "CLOSED · 1" : "OPEN · 0"}
      </span>
    </button>
  );
}
function TransistorSwitch({
  contact,
  high,
  closed,
  onFlip,
}: {
  contact: Contact;
  high: boolean;
  closed: boolean;
  onFlip: () => void;
}) {
  return (
    <button
      type="button"
      className={own.transistorSwitch}
      style={{ left: `${contact.x / 6}%`, top: `${contact.y / 4.2}%` }}
      aria-pressed={high}
      aria-label={`Control ${contact.name}: ${high ? "high" : "low"} voltage. ${contact.kind.toUpperCase()} transistor ${closed ? "conducting" : "blocking"}. Toggle control voltage.`}
      onClick={onFlip}
    >
      <span className={own.transistor} data-on={closed} aria-hidden="true">
        <i className={own.leadLeft} />
        <i className={own.leadRight} />
        <i className={own.controlLead} />
        <span className={own.package}>
          {contact.kind.toUpperCase()}
          <span>{contact.name}</span>
        </span>
      </span>
      <span className={own.voltage} data-high={high}>
        <i aria-hidden="true" />
        {contact.name} · {high ? "HIGH · 1" : "LOW · 0"}
      </span>
    </button>
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
  const contacts = contactsFor(wiring);
  const branched = ["parallel", "nand", "xor", "xnor"].includes(wiring);
  const twoPerBranch = contacts.length === 4;
  const single = contacts.length === 1;
  return (
    <div
      className={own.board}
      role="group"
      aria-label={
        electrical ? "Electrically controlled switches and a lamp" : "Physical switches and a lamp"
      }
    >
      <svg className={own.cables} viewBox="0 0 600 420" aria-hidden="true">
        {branched ? (
          <>
            <Cable d={`M80 230 C48 185 106 95 180 95 L${twoPerBranch ? 154 : 239} 95`} />
            <Cable d={`M180 95 C150 140 160 245 ${twoPerBranch ? 154 : 239} 245`} />
            {twoPerBranch && (
              <>
                <Cable d="M266 95 C285 80 310 110 329 95" />
                <Cable d="M266 245 C285 230 310 260 329 245" />
              </>
            )}
            <Cable
              d={`M${twoPerBranch ? 441 : 351} 95 C438 95 458 145 457 180 C456 225 490 240 485 290`}
            />
            <Cable d={`M${twoPerBranch ? 441 : 351} 245 C465 240 457 230 457 180`} />
          </>
        ) : (
          <>
            <Cable d={`M80 230 C55 158 95 135 ${contacts[0].x - 56} 135`} />
            {!single && <Cable d="M266 135 C285 120 310 150 329 135" />}
            <Cable d={`M${single ? 351 : 441} 135 C490 130 475 235 485 290`} />
          </>
        )}
        <Cable d="M525 290 C566 360 468 378 365 366 C255 352 133 397 80 340" returning />
      </svg>
      <div className={own.battery} role="img" aria-label="Battery">
        <i />
        <span>
          +<b>BATTERY</b>−
        </span>
      </div>
      {contacts.map((contact, index) =>
        electrical ? (
          <TransistorSwitch
            key={index}
            contact={contact}
            high={contact.name === "A" ? a : b}
            closed={conducts(contact, a, b)}
            onFlip={() => onFlip(contact.name)}
          />
        ) : (
          <KnifeSwitch
            key={index}
            contact={contact}
            closed={contact.name === "A" ? a : b}
            onFlip={() => onFlip(contact.name)}
          />
        ),
      )}
      {spark && (
        <span
          key={spark.id}
          className={own.sparkBurst}
          style={{ left: `${spark.x / 6}%`, top: `${spark.y / 4.2}%` }}
          data-testid="switch-spark"
          aria-hidden="true"
        >
          {Array.from({ length: 7 }, (_, index) => (
            <i key={index} />
          ))}
        </span>
      )}
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
    return electrical ? WIRINGS[name].label : name === "series" ? "IN A ROW" : "SIDE BY SIDE";
  }
  return (
    <section
      className={own.experiment}
      aria-label={electrical ? "Transistors and a lamp" : "Switches and a lamp"}
    >
      <div className={own.header}>
        <div>
          <span className={own.eyebrow}>BATTERY · SWITCHES · LAMP</span>
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
      <div className={own.caption}>
        <p>{WIRINGS[wiring].path}</p>
        <p>
          {electrical
            ? "Click a transistor to change its control voltage. NMOS conducts at high; PMOS conducts at low. Contacts with the same letter share one control."
            : "Click the switch handles. A closed switch lets current through; an open switch breaks the path."}
        </p>
      </div>
    </section>
  );
}

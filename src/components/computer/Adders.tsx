import clsx from "clsx";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";
import {
  bit,
  byteBits,
  fullAdd,
  halfAdd,
  rippleStep,
  settledCarries,
  sumWith,
} from "src/lib/computer/gateLogic";
import own from "./Adders.module.css";
import panel from "./ByteExplorer.module.css";
import styles from "./Codebook.module.css";
import { DemoMachine, MiniButton } from "./CodebookParts";
import gates from "./GateDemos.module.css";
import { GateShape, gatePorts, InputMark, LampMark, WirePath } from "./GateDiagram";
import { InputKey, OutputLamp } from "./TruthTables";

type Point = { x: number; y: number };
const p = (x: number, y: number): Point => ({ x, y });

/** A short name on a wire, e.g. "S1", dim while the wire carries 0. */
function WireTag({ x, y, text, on }: { x: number; y: number; text: string; on: boolean }) {
  return (
    <text x={x} y={y} className={clsx(gates.valueTag, !on && gates.valueTagOff)}>
      {text} {bit(on)}
    </text>
  );
}

/** A dashed outline around the gates that make up one half adder. */
function HalfAdderOutline({
  x,
  y,
  width,
  height,
  name,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx="6" className={gates.boxOutline} />
      <text x={x + 2} y={y - 5} className={gates.boxName}>
        {name}
      </text>
    </g>
  );
}

/** A closed half adder: a box with its ports named and lit. */
function HalfAdderBox({
  x,
  y,
  width,
  height,
  name,
  inputs,
  outputs,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  inputs: { y: number; name: string; on: boolean }[];
  outputs: { y: number; name: string; on: boolean }[];
}) {
  const on = outputs.some((output) => output.on);
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="6"
        className={clsx(gates.boxSolid, on && gates.boxSolidOn)}
      />
      <text x={x + width / 2} y={y + height / 2} className={gates.boxNameBig}>
        {name}
      </text>
      {inputs.map((input) => (
        <text
          key={input.name}
          x={x + 7}
          y={input.y}
          className={clsx(gates.valueTag, !input.on && gates.valueTagOff)}
        >
          {input.name}
        </text>
      ))}
      {outputs.map((output) => (
        <text
          key={output.name}
          x={x + width - 7}
          y={output.y}
          textAnchor="end"
          className={clsx(gates.valueTag, !output.on && gates.valueTagOff)}
        >
          {output.name}
        </text>
      ))}
    </g>
  );
}

/** A half adder drawn as its two gates: XOR for SUM, AND for CARRY. */
function HalfAdderBoard({ a, b, sumOnly }: { a: boolean; b: boolean; sumOnly: boolean }) {
  const scale = 1.3;
  const xor = gatePorts("xor", 130, 12, scale);
  const and = gatePorts("and", 130, 86, scale);
  const { sum, carry } = halfAdd(a, b);
  const busA = sumOnly ? xor.inputs[0].y : and.inputs[0].y;
  const busB = sumOnly ? xor.inputs[1].y : and.inputs[1].y;
  return (
    <div className={clsx(gates.board, own.compact)}>
      <svg
        viewBox={sumOnly ? "0 0 316 80" : "0 0 316 152"}
        role="img"
        aria-label={`Half adder. A ${bit(a)}, B ${bit(b)}. XOR gives SUM ${bit(sum)}${sumOnly ? "" : `, AND gives CARRY ${bit(carry)}`}.`}
      >
        <WirePath points={[p(46, 40), p(78, 40)]} on={a} />
        <WirePath points={[p(78, 40), p(78, xor.inputs[0].y), xor.inputs[0]]} on={a} />
        <WirePath points={[p(78, 40), p(78, busA), p(130, busA)]} on={a} dot={[0]} />
        <WirePath points={[p(46, sumOnly ? 62 : 66), p(104, sumOnly ? 62 : 66)]} on={b} />
        <WirePath
          points={[p(104, sumOnly ? 62 : 66), p(104, xor.inputs[1].y), xor.inputs[1]]}
          on={b}
        />
        <WirePath
          points={[p(104, sumOnly ? 62 : 66), p(104, busB), p(130, busB)]}
          on={b}
          dot={[0]}
        />
        <InputMark x={46} y={40} on={a} name="A" />
        <InputMark x={46} y={sumOnly ? 62 : 66} on={b} name="B" />
        <GateShape
          gate="xor"
          x={130}
          y={12}
          scale={scale}
          inputs={[a, b]}
          output={sum}
          label="XOR"
        />
        <WirePath points={[xor.output, p(234, xor.output.y)]} on={sum} />
        <LampMark x={242} y={xor.output.y} on={sum} name="SUM" />
        {!sumOnly && (
          <>
            <GateShape
              gate="and"
              x={130}
              y={86}
              scale={scale}
              inputs={[a, b]}
              output={carry}
              label="AND"
            />
            <WirePath points={[and.output, p(234, and.output.y)]} on={carry} />
            <LampMark x={242} y={and.output.y} on={carry} name="CARRY" />
          </>
        )}
      </svg>
    </div>
  );
}

/**
 * The half adder: A and B go into an XOR, which gives SUM, and into an AND,
 * which gives CARRY. With `sumOnly`, only the XOR half is drawn. Usable in MDX articles.
 */
export function HalfAdder({ sumOnly = false }: { sumOnly?: boolean }) {
  const [inputs, setInputs] = useState([true, false]);
  const { soundEnabled, toggleSound, playSwitch } = usePanelSound();
  const [a, b] = inputs;
  const { sum, carry } = halfAdd(a, b);
  function flip(index: number) {
    setInputs(inputs.map((value, at) => (at === index ? !value : value)));
    playSwitch();
  }
  return (
    <DemoMachine
      title={sumOnly ? "THE SUM BIT" : "HALF ADDER"}
      label={sumOnly ? "An XOR gate gives the sum bit" : "A half adder built from XOR and AND"}
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={gates.demo}
    >
      <div className={own.single}>
        <div className={styles.plate}>
          <div className={panel.sectionHead}>
            <span>{sumOnly ? "A XOR B" : "XOR + AND"}</span>
            <span>{sumOnly ? "1 GATE" : "2 GATES"}</span>
          </div>
          <HalfAdderBoard a={a} b={b} sumOnly={sumOnly} />
          <div className={own.controls}>
            <div className={gates.keys}>
              <InputKey name="A" on={a} onFlip={() => flip(0)} />
              <InputKey name="B" on={b} onFlip={() => flip(1)} />
              <span className={gates.arrow} aria-hidden="true">
                →
              </span>
              {!sumOnly && <OutputLamp name="CARRY" on={carry} />}
              <OutputLamp name="SUM" on={sum} />
            </div>
            <div className={clsx(panel.screen, styles.lcd, own.lcd)} aria-live="polite">
              <div className={panel.screenTop}>
                <span>{sumOnly ? "SUM BIT" : "RESULT"}</span>
                <span>{sumOnly ? "" : "CARRY · SUM"}</span>
              </div>
              <div className={gates.sumLine}>
                {bit(a)} + {bit(b)} ={" "}
                {sumOnly ? (a && b ? "?0" : bit(sum)) : `${bit(carry)}${bit(sum)}`}
              </div>
            </div>
          </div>
          <p className={gates.note}>
            {sumOnly
              ? a && b
                ? "1 + 1 is 10 in binary. XOR gives the 0. The 1 still has to go somewhere."
                : "XOR is 1 when exactly one input is 1. That is the sum bit."
              : "XOR gives the sum bit. AND gives the carry: 1 only when both bits are 1."}
          </p>
        </div>
      </div>
    </DemoMachine>
  );
}

/** The full adder, as two half adders and an OR, either as gates or as boxes. */
export function FullAdderDiagram({
  a,
  b,
  carryIn,
  unfolded,
}: {
  a: boolean;
  b: boolean;
  carryIn: boolean;
  unfolded: boolean;
}) {
  const { sum, carry, first, second } = fullAdd(a, b, carryIn);
  const label = `Full adder${unfolded ? ", unfolded to gates" : ""}. A ${bit(a)}, B ${bit(b)}, CARRY IN ${bit(carryIn)}. First half adder: S1 ${bit(first.sum)}, C1 ${bit(first.carry)}. Second half adder: SUM ${bit(second.sum)}, C2 ${bit(second.carry)}. OR gives CARRY OUT ${bit(carry)}.`;

  if (!unfolded) {
    const or = gatePorts("or", 440, 60, 1.1);
    return (
      <svg viewBox="0 -8 590 172" role="img" aria-label={label}>
        <WirePath points={[p(52, 55), p(90, 55)]} on={a} />
        <WirePath points={[p(52, 95), p(90, 95)]} on={b} />
        <WirePath points={[p(52, 150), p(240, 150), p(240, 60), p(260, 60)]} on={carryIn} />
        <WirePath points={[p(200, 55), p(230, 55), p(230, 30), p(260, 30)]} on={first.sum} />
        <WirePath
          points={[p(200, 95), p(430, 95), p(430, or.inputs[1].y), or.inputs[1]]}
          on={first.carry}
        />
        <WirePath
          points={[p(370, 60), p(420, 60), p(420, or.inputs[0].y), or.inputs[0]]}
          on={second.carry}
        />
        <WirePath points={[p(370, 30), p(522, 30)]} on={sum} />
        <WirePath points={[or.output, p(522, or.output.y)]} on={carry} />
        <InputMark x={52} y={55} on={a} name="A" />
        <InputMark x={52} y={95} on={b} name="B" />
        <InputMark x={52} y={150} on={carryIn} name="CIN" />
        <HalfAdderBox
          x={90}
          y={30}
          width={110}
          height={90}
          name="HALF ADDER"
          inputs={[
            { y: 55, name: "A", on: a },
            { y: 95, name: "B", on: b },
          ]}
          outputs={[
            { y: 55, name: "S", on: first.sum },
            { y: 95, name: "C", on: first.carry },
          ]}
        />
        <HalfAdderBox
          x={260}
          y={10}
          width={110}
          height={70}
          name="HALF ADDER"
          inputs={[
            { y: 30, name: "A", on: first.sum },
            { y: 60, name: "B", on: carryIn },
          ]}
          outputs={[
            { y: 30, name: "S", on: second.sum },
            { y: 60, name: "C", on: second.carry },
          ]}
        />
        <WireTag x={206} y={44} text="S1" on={first.sum} />
        <WireTag x={290} y={108} text="C1" on={first.carry} />
        <WireTag x={378} y={72} text="C2" on={second.carry} />
        <GateShape
          gate="or"
          x={440}
          y={60}
          scale={1.1}
          inputs={[second.carry, first.carry]}
          output={carry}
          label="OR"
        />
        <LampMark x={530} y={30} on={sum} name="SUM" />
        <LampMark x={530} y={or.output.y} on={carry} name="COUT" />
      </svg>
    );
  }

  const scale = 1.1;
  const xor1 = gatePorts("xor", 130, 20, scale);
  const and1 = gatePorts("and", 130, 85, scale);
  const xor2Y = xor1.output.y - 13 * scale;
  const xor2 = gatePorts("xor", 300, xor2Y, scale);
  const and2 = gatePorts("and", 300, 140, scale);
  const or = gatePorts("or", 430, 110, scale);
  return (
    <svg viewBox="0 -12 590 226" role="img" aria-label={label}>
      <HalfAdderOutline x={80} y={8} width={134} height={132} name="HALF ADDER 1" />
      <HalfAdderOutline x={240} y={14} width={144} height={180} name="HALF ADDER 2" />
      <WirePath points={[p(52, 50), p(90, 50)]} on={a} />
      <WirePath points={[p(90, 50), p(90, xor1.inputs[0].y), xor1.inputs[0]]} on={a} dot={[0]} />
      <WirePath points={[p(90, 50), p(90, and1.inputs[0].y), and1.inputs[0]]} on={a} />
      <WirePath points={[p(52, 80), p(110, 80)]} on={b} />
      <WirePath points={[p(110, 80), p(110, xor1.inputs[1].y), xor1.inputs[1]]} on={b} dot={[0]} />
      <WirePath points={[p(110, 80), p(110, and1.inputs[1].y), and1.inputs[1]]} on={b} />
      <WirePath
        points={[p(52, 204), p(270, 204), p(270, xor2.inputs[1].y), xor2.inputs[1]]}
        on={carryIn}
      />
      <WirePath points={[p(270, and2.inputs[1].y), and2.inputs[1]]} on={carryIn} dot={[0]} />
      <WirePath
        points={[xor1.output, p(250, xor1.output.y), xor2.inputs[0]]}
        on={first.sum}
        dot={[1]}
      />
      <WirePath
        points={[p(250, xor1.output.y), p(250, and2.inputs[0].y), and2.inputs[0]]}
        on={first.sum}
      />
      <WirePath
        points={[and1.output, p(410, and1.output.y), p(410, or.inputs[0].y), or.inputs[0]]}
        on={first.carry}
      />
      <WirePath
        points={[and2.output, p(418, and2.output.y), p(418, or.inputs[1].y), or.inputs[1]]}
        on={second.carry}
      />
      <WirePath points={[xor2.output, p(522, xor2.output.y)]} on={sum} />
      <WirePath points={[or.output, p(522, or.output.y)]} on={carry} />
      <InputMark x={52} y={50} on={a} name="A" />
      <InputMark x={52} y={80} on={b} name="B" />
      <InputMark x={52} y={204} on={carryIn} name="CIN" />
      <GateShape
        gate="xor"
        x={130}
        y={20}
        scale={scale}
        inputs={[a, b]}
        output={first.sum}
        label="XOR"
      />
      <GateShape
        gate="and"
        x={130}
        y={85}
        scale={scale}
        inputs={[a, b]}
        output={first.carry}
        label="AND"
      />
      <GateShape
        gate="xor"
        x={300}
        y={xor2Y}
        scale={scale}
        inputs={[first.sum, carryIn]}
        output={second.sum}
        label="XOR"
      />
      <GateShape
        gate="and"
        x={300}
        y={140}
        scale={scale}
        inputs={[first.sum, carryIn]}
        output={second.carry}
        label="AND"
      />
      <GateShape
        gate="or"
        x={430}
        y={110}
        scale={scale}
        inputs={[first.carry, second.carry]}
        output={carry}
        label="OR"
      />
      <WireTag x={206} y={34} text="S1" on={first.sum} />
      <WireTag x={330} y={100} text="C1" on={first.carry} />
      <WireTag x={376} y={176} text="C2" on={second.carry} />
      <LampMark x={530} y={xor2.output.y} on={sum} name="SUM" />
      <LampMark x={530} y={or.output.y} on={carry} name="COUT" />
    </svg>
  );
}

function FoldKeys({
  unfolded,
  onChange,
}: {
  unfolded: boolean;
  onChange: (unfolded: boolean) => void;
}) {
  return (
    <div className={styles.segmented} role="group" aria-label="Show the half adders as">
      <button type="button" aria-pressed={!unfolded} onClick={() => onChange(false)}>
        BOXES
      </button>
      <button type="button" aria-pressed={unfolded} onClick={() => onChange(true)}>
        GATES
      </button>
    </div>
  );
}

/**
 * The full adder: two half adders in a row and an OR for the two carries.
 * BOXES shows the half adders closed, GATES opens them. Usable in MDX articles.
 */
export function FullAdder({ unfolded: initialUnfolded = true }: { unfolded?: boolean }) {
  const [inputs, setInputs] = useState([true, true, false]);
  const [unfolded, setUnfolded] = useState(initialUnfolded);
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const [a, b, carryIn] = inputs;
  const { sum, carry } = fullAdd(a, b, carryIn);
  const names = ["A", "B", "CIN"];
  return (
    <DemoMachine
      title="FULL ADDER"
      label="A full adder built from two half adders and an OR gate"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={gates.demo}
    >
      <div className={own.single}>
        <div className={styles.plate}>
          <div className={clsx(panel.sectionHead, gates.headWrap)}>
            <span>2 HALF ADDERS + OR</span>
            <FoldKeys
              unfolded={unfolded}
              onChange={(next) => {
                setUnfolded(next);
                playButton();
              }}
            />
          </div>
          <div className={clsx(gates.board, own.wide)}>
            <FullAdderDiagram a={a} b={b} carryIn={carryIn} unfolded={unfolded} />
          </div>
          <div className={own.controls}>
            <div className={gates.keys}>
              {names.map((name, index) => (
                <InputKey
                  key={name}
                  name={name}
                  on={inputs[index]}
                  onFlip={() => {
                    setInputs(inputs.map((value, at) => (at === index ? !value : value)));
                    playSwitch();
                  }}
                />
              ))}
              <span className={gates.arrow} aria-hidden="true">
                →
              </span>
              <OutputLamp name="COUT" on={carry} />
              <OutputLamp name="SUM" on={sum} />
            </div>
            <div className={clsx(panel.screen, styles.lcd, own.lcd)} aria-live="polite">
              <div className={panel.screenTop}>
                <span>RESULT</span>
                <span>COUT · SUM</span>
              </div>
              <div className={gates.sumLine}>
                {bit(a)}+{bit(b)}+{bit(carryIn)} = {bit(carry)}
                {bit(sum)}
              </div>
            </div>
          </div>
          <p className={gates.note}>
            The first half adder adds A and B. The second adds CARRY IN to that sum. If either half
            adder carries, the OR sends the carry out.
          </p>
        </div>
      </div>
    </DemoMachine>
  );
}

const PRESETS: { label: string; a: number; b: number }[] = [
  { label: "13 + 29", a: 13, b: 29 },
  { label: "100 + 200", a: 100, b: 200 },
  { label: "255 + 1", a: 255, b: 1 },
  { label: "0 + 0", a: 0, b: 0 },
];
const STEP_MS = 420;

function ByteKeys({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className={gates.byteRow} aria-label={`Byte ${name}: ${value}`}>
      <span aria-hidden="true">{name}</span>
      {Array.from(byteBits(value), (digit, index) => {
        const position = 7 - index;
        const on = digit === "1";
        return (
          <button
            key={position}
            type="button"
            className={panel.bitButton}
            aria-pressed={on}
            aria-label={`${name} bit ${position} (worth ${2 ** position}): ${digit}. Flip.`}
            onClick={() => onChange(value ^ (1 << position))}
          >
            {digit}
          </button>
        );
      })}
      <span className={gates.byteValue} aria-hidden="true">
        {value}
      </span>
    </fieldset>
  );
}

/**
 * Eight full adders in a row add two bytes. Each passes its carry to the one on
 * its left. Press a full adder to open it; with RIPPLE on, watch the carries
 * settle one full adder at a time. Usable in MDX articles.
 */
export function EightBitAdder() {
  const [a, setA] = useState(13);
  const [b, setB] = useState(29);
  const [open, setOpen] = useState<number | null>(null);
  const [unfolded, setUnfolded] = useState(false);
  const [ripple, setRipple] = useState(true);
  const [carries, setCarries] = useState(() => settledCarries(13, 29));
  const [steps, setSteps] = useState(0);
  const { soundEnabled, toggleSound, playSwitch, playButton } = usePanelSound();
  const target = useMemo(() => settledCarries(a, b), [a, b]);
  const settled = carries.every((carry, index) => carry === target[index]);
  const shown = ripple ? carries : target;
  const sum = sumWith(a, b, shown);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  // One gate delay per tick: every full adder looks at the carry it sees now.
  useEffect(() => {
    if (!ripple || settled) return;
    if (reducedMotion.current) {
      setCarries(target);
      return;
    }
    const timer = window.setTimeout(() => {
      setCarries((current) => rippleStep(a, b, current));
      setSteps((count) => count + 1);
    }, STEP_MS);
    return () => window.clearTimeout(timer);
  }, [a, b, carries, ripple, settled, target]);

  function change(nextA: number, nextB: number) {
    setA(nextA);
    setB(nextB);
    setSteps(0);
    if (!ripple) setCarries(settledCarries(nextA, nextB));
  }

  const status = !ripple
    ? "RIPPLE OFF: CARRIES SETTLE AT ONCE"
    : settled
      ? steps === 0
        ? "SETTLED"
        : `SETTLED AFTER ${steps} ${steps === 1 ? "STEP" : "STEPS"}`
      : `CARRIES RIPPLING · STEP ${steps + 1}`;

  return (
    <DemoMachine
      title="8-BIT ADDER"
      label="Eight full adders adding two bytes"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={gates.demo}
    >
      <div className={own.single}>
        <div className={styles.plate}>
          <div className={clsx(panel.sectionHead, gates.headWrap)}>
            <span>A + B</span>
            <div className={styles.segmented} role="group" aria-label="Examples">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={a === preset.a && b === preset.b}
                  onClick={() => {
                    change(preset.a, preset.b);
                    playButton();
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className={gates.byteWeights} aria-hidden="true">
            <span />
            {[128, 64, 32, 16, 8, 4, 2, 1].map((weight) => (
              <span key={weight}>{weight}</span>
            ))}
            <span />
          </div>
          <ByteKeys
            name="A"
            value={a}
            onChange={(next) => {
              change(next, b);
              playSwitch();
            }}
          />
          <ByteKeys
            name="B"
            value={b}
            onChange={(next) => {
              change(a, next);
              playSwitch();
            }}
          />
          <ol className={own.chain} aria-label="Full adders, bit 7 to bit 0">
            <li className={own.carryEnd}>
              <i data-on={shown[8]} aria-hidden="true" />
              <span>COUT</span>
            </li>
            {Array.from({ length: 8 }, (_, index) => {
              const position = 7 - index;
              return (
                <li key={position} className={own.faCell} data-carry-out={shown[position + 1]}>
                  <button
                    type="button"
                    className={own.fa}
                    aria-pressed={open === position}
                    data-carry-in={shown[position]}
                    aria-label={`Full adder for bit ${position}: carry in ${bit(shown[position])}, carry out ${bit(shown[position + 1])}. ${open === position ? "Close" : "Open"} it.`}
                    onClick={() => {
                      setOpen(open === position ? null : position);
                      playButton();
                    }}
                  >
                    <b>FA</b>
                    <small>{position}</small>
                  </button>
                </li>
              );
            })}
            <li className={own.carryStart} data-on={shown[0]}>
              <span>CIN 0</span>
            </li>
          </ol>
          <div className={gates.sumBits} role="group" aria-label={`Sum: ${sum}`}>
            <span aria-hidden="true">SUM</span>
            {Array.from(byteBits(sum), (digit, index) => (
              <i key={7 - index} data-on={digit === "1"} aria-hidden="true">
                {digit}
              </i>
            ))}
            <span className={gates.byteValue} aria-hidden="true">
              {sum}
            </span>
          </div>
          <div className={clsx(panel.screen, styles.lcd)} aria-live="polite">
            <div className={panel.screenTop}>
              <span>{status}</span>
              <button
                type="button"
                className={own.rippleToggle}
                aria-pressed={ripple}
                onClick={() => {
                  setRipple(!ripple);
                  setCarries(settledCarries(a, b));
                  setSteps(0);
                  playButton();
                }}
              >
                RIPPLE {ripple ? "ON" : "OFF"}
              </button>
            </div>
            <div className={gates.sumLine}>
              {a} + {b} = {shown[8] ? 256 + sum : sum}
            </div>
            <div className={styles.lcdLine}>
              {shown[8] ? "1 " : ""}
              {byteBits(sum)}
              {shown[8] ? " · 9 BITS: COUT IS THE 9TH" : ""}
            </div>
          </div>
          {open !== null && (
            <section className={own.detail} aria-label={`Full adder for bit ${open}`}>
              <div className={clsx(panel.sectionHead, gates.headWrap)}>
                <span>FULL ADDER {open}</span>
                <div className={own.detailKeys}>
                  <FoldKeys
                    unfolded={unfolded}
                    onChange={(next) => {
                      setUnfolded(next);
                      playButton();
                    }}
                  />
                  <MiniButton
                    label="Close this full adder"
                    onClick={() => {
                      setOpen(null);
                      playButton();
                    }}
                  >
                    ✕
                  </MiniButton>
                </div>
              </div>
              <div className={clsx(gates.board, own.wide)}>
                <FullAdderDiagram
                  a={Boolean((a >> open) & 1)}
                  b={Boolean((b >> open) & 1)}
                  carryIn={shown[open]}
                  unfolded={unfolded}
                />
              </div>
              <p className={gates.note}>
                Bit {open} adds A {bit(Boolean((a >> open) & 1))}, B {bit(Boolean((b >> open) & 1))}{" "}
                and the carry {bit(shown[open])} from bit {open === 0 ? "CIN" : open - 1}. Each gate
                is built from transistors: <Link href="/computer/transistor-gates">see how</Link>.
              </p>
            </section>
          )}
          <p className={gates.note}>
            Each full adder waits for the carry from its right. A long run of carries, as in 255 +
            1, takes longest to settle.
          </p>
        </div>
      </div>
    </DemoMachine>
  );
}

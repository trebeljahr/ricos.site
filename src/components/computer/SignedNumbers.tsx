import clsx from "clsx";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePanelSound } from "src/hooks/usePanelSound";

import {
  bitMask,
  bitPattern,
  bitWeight,
  decodeInteger,
  displayInteger,
  INTEGER_ENCODINGS,
  type IntegerEncoding,
  readSignedAdder,
  type SignedWidth,
  signedAdderCircuit,
  signedAdderInputs,
} from "../../lib/computer/signedNumbers";
import panel from "./ByteExplorer.module.css";
import { DemoMachine, Lever } from "./CodebookParts";
import { type LockedClock, type LockedView, LogicBuilder } from "./LogicBuilder";
import styles from "./SignedNumbers.module.css";

function WidthControl({
  width,
  onChange,
}: {
  width: SignedWidth;
  onChange: (width: SignedWidth) => void;
}) {
  return (
    <fieldset className={styles.controls} aria-label="Word width">
      {([4, 8] as const).map((bits) => (
        <button
          type="button"
          key={bits}
          aria-pressed={width === bits}
          onClick={() => onChange(bits)}
        >
          {bits} BITS
        </button>
      ))}
    </fieldset>
  );
}

function BitKeys({
  raw,
  width,
  label,
  onChange,
}: {
  raw: number;
  width: SignedWidth;
  label: string;
  onChange: (raw: number) => void;
}) {
  return (
    <fieldset
      className={styles.bits}
      style={{ "--bits": width } as CSSProperties}
      aria-label={label}
    >
      {Array.from({ length: width }, (_, index) => {
        const bit = width - index - 1;
        const on = Boolean(raw & (1 << bit));
        const sign = index === 0;
        return (
          <div className={clsx(styles.bit, sign && styles.sign)} key={bit}>
            <span className={styles.place}>
              {sign && "−"}2<sup>{bit}</sup>
            </span>
            <span className={styles.weight}>
              {displayInteger(bitWeight(bit, width, "twos-complement"))}
            </span>
            <button
              type="button"
              aria-label={`${label} bit ${bit}, ${on ? 1 : 0}`}
              aria-pressed={on}
              className={panel.bitButton}
              onClick={() => onChange(raw ^ (1 << bit))}
            >
              {on ? 1 : 0}
            </button>
            <small>{sign ? "SIGN BIT" : `BIT ${bit}`}</small>
          </div>
        );
      })}
    </fieldset>
  );
}

/** The bit's weight written as a power of two, the way the mode reads it. */
function Power({
  bit,
  width,
  encoding,
}: {
  bit: number;
  width: SignedWidth;
  encoding: IntegerEncoding;
}) {
  const power = (
    <>
      2<sup>{bit}</sup>
    </>
  );
  if (bit !== width - 1 || encoding === "unsigned") return power;
  if (encoding === "sign-magnitude") return <>±</>;
  if (encoding === "twos-complement") return <>−{power}</>;
  return <>−({power}−1)</>;
}

/** Every digit times its power, then what those come to, then the number. */
function Formula({
  raw,
  width,
  encoding,
}: {
  raw: number;
  width: SignedWidth;
  encoding: IntegerEncoding;
}) {
  const signed = encoding === "sign-magnitude";
  const count = signed ? width - 1 : width;
  const bits = Array.from({ length: count }, (_, index) => count - index - 1);
  const digit = (bit: number) => (raw & (1 << bit) ? 1 : 0);
  const prefix = signed ? (digit(width - 1) ? "−(" : "+(") : "";
  const suffix = signed ? ")" : "";
  return (
    <code className={styles.formula}>
      <span>
        {prefix}
        {bits.map((bit, index) => {
          const top = bit === width - 1 && encoding !== "unsigned";
          return (
            <span key={bit}>
              {index > 0 && " + "}
              <span className={styles.term}>
                {digit(bit)}×{top && "("}
                <Power bit={bit} width={width} encoding={encoding} />
                {top && ")"}
              </span>
            </span>
          );
        })}
        {suffix}
      </span>
      <span>
        = {prefix}
        {bits
          .map((bit) => (digit(bit) ? displayInteger(bitWeight(bit, width, encoding)) : "0"))
          .join(" + ")}
        {suffix}
      </span>
      <span>= {displayInteger(decodeInteger(raw, width, encoding))}</span>
    </code>
  );
}

function BitLevers({
  raw,
  width,
  encoding,
  onFlip,
}: {
  raw: number;
  width: SignedWidth;
  encoding: IntegerEncoding;
  onFlip: (bit: number) => void;
}) {
  return (
    <fieldset
      className={styles.levers}
      style={{ "--bits": width } as CSSProperties}
      aria-label="Stored pattern"
    >
      {Array.from({ length: width }, (_, index) => {
        const bit = width - index - 1;
        const on = Boolean(raw & (1 << bit));
        return (
          <div className={styles.lever} key={bit}>
            <span className={styles.place}>
              <Power bit={bit} width={width} encoding={encoding} />
            </span>
            <Lever on={on} label={`Bit ${bit}`} onFlip={() => onFlip(bit)} />
            <b>{on ? 1 : 0}</b>
          </div>
        );
      })}
    </fieldset>
  );
}

function PatternList({
  raw,
  encoding,
  onPick,
}: {
  raw: number;
  encoding: IntegerEncoding;
  onPick: (pattern: number) => void;
}) {
  return (
    <ol className={styles.list} aria-label="All sixteen bit patterns">
      {Array.from({ length: 16 }, (_, pattern) => (
        <li key={pattern}>
          <button type="button" aria-pressed={pattern === raw} onClick={() => onPick(pattern)}>
            <code>{bitPattern(pattern, 4)}</code>{" "}
            <span>{displayInteger(decodeInteger(pattern, 4, encoding))}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

export function SignedNumberExplorer() {
  const [width, setWidth] = useState<SignedWidth>(4);
  const [raw, setRaw] = useState(11);
  const [encoding, setEncoding] = useState<IntegerEncoding>("twos-complement");
  const { soundEnabled, toggleSound, playButton, playSwitch, playToggle } = usePanelSound();
  const value = decodeInteger(raw, width, encoding);
  const mask = bitMask(width);
  const step = (by: number) => {
    setRaw((raw + by) & mask);
    playButton();
  };

  return (
    <DemoMachine
      title="SIGNED NUMBER REPRESENTATIONS"
      label="Signed number representations"
      soundEnabled={soundEnabled}
      onToggleSound={toggleSound}
      className={styles.explorer}
    >
      <div className={clsx(styles.plate, styles.explorerPlate)}>
        <div className={styles.explorerMain}>
          <div className={styles.selectors}>
            <fieldset className={styles.selector}>
              <legend>READ AS</legend>
              <div className={clsx(panel.presetRow, styles.modes)}>
                {INTEGER_ENCODINGS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={item.id === encoding}
                    onClick={() => {
                      setEncoding(item.id);
                      playSwitch();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className={styles.selector}>
              <legend>WIDTH</legend>
              <div className={clsx(panel.presetRow, styles.modes)}>
                {([4, 8] as const).map((bits) => (
                  <button
                    type="button"
                    key={bits}
                    aria-pressed={width === bits}
                    onClick={() => {
                      setRaw(raw & bitMask(bits));
                      setWidth(bits);
                      playSwitch();
                    }}
                  >
                    {bits} BITS
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className={styles.bank}>
            <button
              type="button"
              className={clsx(panel.bitButton, styles.stepKey)}
              aria-label="Previous bit pattern"
              onClick={() => step(-1)}
            >
              −1
            </button>
            <BitLevers
              raw={raw}
              width={width}
              encoding={encoding}
              onFlip={(bit) => {
                setRaw(raw ^ (1 << bit));
                playToggle(!(raw & (1 << bit)));
              }}
            />
            <button
              type="button"
              className={clsx(panel.bitButton, styles.stepKey)}
              aria-label="Next bit pattern"
              onClick={() => step(1)}
            >
              +1
            </button>
          </div>
          <div className={clsx(panel.screen, styles.reading)} aria-live="polite">
            <output aria-label="Interpreted value">{displayInteger(value)}</output>
            <Formula raw={raw} width={width} encoding={encoding} />
          </div>
        </div>
        {width === 4 && (
          <PatternList
            raw={raw}
            encoding={encoding}
            onPick={(pattern) => {
              setRaw(pattern);
              playButton();
            }}
          />
        )}
      </div>
    </DemoMachine>
  );
}

function Operand({
  label,
  value,
  width,
  onChange,
}: {
  label: string;
  value: number;
  width: SignedWidth;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const minimum = -(2 ** (width - 1));
  const maximum = 2 ** (width - 1) - 1;
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <div className={styles.operand}>
      <label className={styles.number}>
        {label}
        <input
          type="number"
          min={minimum}
          max={maximum}
          value={draft}
          aria-label={`${label} signed integer`}
          onChange={(event) => {
            setDraft(event.target.value);
            if (/^-?\d+$/.test(event.target.value))
              onChange(Math.max(minimum, Math.min(maximum, Number(event.target.value))));
          }}
          onBlur={() => setDraft(String(value))}
        />
      </label>
      <BitKeys
        label={label}
        raw={value & bitMask(width)}
        width={width}
        onChange={(raw) => onChange(decodeInteger(raw, width, "twos-complement"))}
      />
    </div>
  );
}

function ArithmeticBench({ width }: { width: SignedWidth }) {
  const circuit = useMemo(() => signedAdderCircuit(width), [width]);
  const initialFocus = useMemo(() => circuit.nodes.map((node) => node.id), [circuit]);
  const clock = useRef<LockedClock | null>(null);
  const [a, setA] = useState(2);
  const [b, setB] = useState(-5);
  const [subtract, setSubtract] = useState(false);
  const [reading, setReading] = useState<ReturnType<typeof readSignedAdder> | null>(null);
  const onFrame = useCallback(
    (view: LockedView) => setReading(readSignedAdder(view.frame.snapshot, width)),
    [width],
  );
  useEffect(() => {
    clock.current?.input(signedAdderInputs(a, b, width, subtract));
  }, [a, b, width, subtract]);
  const signed = (raw: number) => decodeInteger(raw, width, "twos-complement");
  // Only the explanatory unbounded answer uses JS arithmetic. Stored bits and both flags come from the circuit frame.
  const exact = reading
    ? signed(reading.a) + (reading.subtract ? -signed(reading.b) : signed(reading.b))
    : null;
  const examples = [
    { a: 2, b: -5, sub: false, label: "2 + (−5)" },
    { a: 4, b: 7, sub: false, label: "4 + 7" },
    { a: -8, b: -3, sub: false, label: "−8 + (−3)" },
    { a: -1, b: 1, sub: false, label: "−1 + 1" },
    { a: 2, b: 5, sub: true, label: "2 − 5" },
  ];

  return (
    <>
      <div className={styles.plate}>
        <div className={styles.operands}>
          <Operand label="A" value={a} width={width} onChange={setA} />
          <Operand label="B" value={b} width={width} onChange={setB} />
        </div>
        <div className={styles.operation}>
          <fieldset className={styles.controls} aria-label="Arithmetic operation">
            <button type="button" aria-pressed={!subtract} onClick={() => setSubtract(false)}>
              A + B
            </button>
            <button type="button" aria-pressed={subtract} onClick={() => setSubtract(true)}>
              A − B
            </button>
          </fieldset>
          <span>
            TWO’S COMPLEMENT · {-(2 ** (width - 1))} TO {2 ** (width - 1) - 1}
          </span>
        </div>
        <div className={clsx(panel.screen, styles.result)} aria-live="polite">
          {reading && (
            <>
              <div className={styles.answer}>
                <span>
                  {displayInteger(signed(reading.a))} {reading.subtract ? "−" : "+"} (
                  {displayInteger(signed(reading.b))})
                </span>
                <output aria-label="Circuit signed result">
                  {displayInteger(signed(reading.raw))}
                </output>
                <code>{bitPattern(reading.raw, width)}</code>
              </div>
              <div className={styles.flags}>
                <span data-on={reading.carry}>
                  CARRY OUT <output aria-label="Circuit carry out">{Number(reading.carry)}</output>
                </span>
                <span data-on={reading.overflow}>
                  SIGNED OVERFLOW{" "}
                  <output aria-label="Circuit signed overflow">{Number(reading.overflow)}</output>
                </span>
              </div>
              <p>
                {reading.overflow
                  ? `The exact answer ${displayInteger(exact ?? 0)} is outside this signed range. The stored bits wrap to ${displayInteger(signed(reading.raw))}.`
                  : "The exact answer fits in this signed range."}
              </p>
            </>
          )}
        </div>
        <fieldset className={styles.controls} aria-label="Arithmetic examples">
          {examples.map((example) => (
            <button
              type="button"
              key={example.label}
              onClick={() => {
                setA(example.a);
                setB(example.b);
                setSubtract(example.sub);
              }}
            >
              {example.label}
            </button>
          ))}
        </fieldset>
        {reading && (
          <p className={styles.wiring}>
            {reading.subtract
              ? "SUB = 1. Each XOR inverts B. The first carry-in adds 1."
              : "SUB = 0. Each XOR passes B through. The first carry-in is 0."}
            <br />
            <code>
              {bitPattern(reading.a, width)} + {bitPattern(reading.effectiveB, width)} +{" "}
              {Number(reading.subtract)} → {bitPattern(reading.raw, width)}
            </code>
          </p>
        )}
        <details className={styles.comparison}>
          <summary>Why does the encoding matter to addition?</summary>
          <div className={styles.controls}>
            <button
              type="button"
              onClick={() => {
                setA(2);
                setB(signed((1 << (width - 1)) | 5));
                setSubtract(false);
              }}
            >
              Try sign-magnitude 2 + (−5)
            </button>
          </div>
          {reading && (
            <>
              <p className={styles.hint}>
                Current wires: A = <code>{bitPattern(reading.a, width)}</code>, B ={" "}
                <code>{bitPattern(reading.b, width)}</code>, result ={" "}
                <code>{bitPattern(reading.raw, width)}</code>.
              </p>
              <div className={styles.tableScroll}>
                <table aria-label="Same circuit wires under different signed encodings">
                  <thead>
                    <tr>
                      <th>Encoding</th>
                      <th>Decoded inputs</th>
                      <th>Exact answer</th>
                      <th>Decoded result</th>
                      <th>Check</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INTEGER_ENCODINGS.filter((item) => item.id !== "unsigned").map((item) => {
                      const decodedA = decodeInteger(reading.a, width, item.id);
                      const decodedB = decodeInteger(reading.b, width, item.id);
                      const decodedResult = decodeInteger(reading.raw, width, item.id);
                      const expected = decodedA + (reading.subtract ? -decodedB : decodedB);
                      const maximum = 2 ** (width - 1) - 1;
                      const minimum = item.id === "twos-complement" ? -maximum - 1 : -maximum;
                      const outside = expected < minimum || expected > maximum;
                      return (
                        <tr key={item.id}>
                          <th scope="row">{item.label}</th>
                          <td>
                            {displayInteger(decodedA)} {reading.subtract ? "−" : "+"} (
                            {displayInteger(decodedB)})
                          </td>
                          <td>{displayInteger(expected)}</td>
                          <td>{displayInteger(decodedResult)}</td>
                          <td>
                            {outside
                              ? "Outside range"
                              : expected === decodedResult
                                ? "Matches"
                                : "Mismatch"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </details>
      </div>
      <section className={styles.circuit} aria-label={`${width}-bit signed adder circuit`}>
        <LogicBuilder
          initialFocus={initialFocus}
          storageKey={null}
          locked={{ circuit, clockRef: clock, onFrame }}
        />
      </section>
    </>
  );
}

export function SignedArithmetic() {
  const [width, setWidth] = useState<SignedWidth>(4);
  return (
    <section
      className={clsx("not-prose", panel.machine, styles.machine)}
      aria-label="Signed arithmetic circuit"
    >
      <header className={styles.header}>
        <strong>ADD AND SUBTRACT THE SAME WAY</strong>
        <WidthControl width={width} onChange={setWidth} />
      </header>
      <ArithmeticBench key={width} width={width} />
    </section>
  );
}

export function SignedNumbers() {
  return (
    <div className={styles.demos}>
      <SignedNumberExplorer />
      <SignedArithmetic />
    </div>
  );
}

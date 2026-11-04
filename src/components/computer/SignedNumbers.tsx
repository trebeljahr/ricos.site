import clsx from "clsx";
import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

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

function PlaceLabel({
  bit,
  top,
  encoding,
}: {
  bit: number;
  top: boolean;
  encoding: IntegerEncoding;
}) {
  const power = (
    <>
      2<sup>{bit}</sup>
    </>
  );
  if (!top || encoding === "unsigned") return power;
  if (encoding === "sign-magnitude") return "±";
  if (encoding === "twos-complement") return <>−{power}</>;
  return <>−({power}−1)</>;
}

function BitKeys({
  raw,
  width,
  label,
  onChange,
  encoding = "twos-complement",
}: {
  raw: number;
  width: SignedWidth;
  label: string;
  onChange: (raw: number) => void;
  encoding?: IntegerEncoding;
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
        const sign = index === 0 && encoding !== "unsigned";
        const weight =
          encoding === "sign-magnitude" && sign
            ? "SIGN"
            : displayInteger(bitWeight(bit, width, encoding));
        return (
          <div className={clsx(styles.bit, sign && styles.sign)} key={bit}>
            <span className={styles.place}>
              <PlaceLabel bit={bit} top={index === 0} encoding={encoding} />
            </span>
            <span className={styles.weight}>{weight}</span>
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

function contribution(raw: number, width: SignedWidth, encoding: IntegerEncoding) {
  const places = (count: number) => Array.from({ length: count }, (_, index) => count - index - 1);
  if (encoding === "sign-magnitude") {
    const terms = places(width - 1).map((bit) => (raw & (1 << bit) ? String(2 ** bit) : "0"));
    return `${raw & (1 << (width - 1)) ? "−" : "+"}(${terms.join(" + ")})`;
  }
  return places(width)
    .map((bit) => (raw & (1 << bit) ? displayInteger(bitWeight(bit, width, encoding)) : "0"))
    .join(" + ");
}

function EncodingToggle({
  value,
  onChange,
}: {
  value: IntegerEncoding;
  onChange: (encoding: IntegerEncoding) => void;
}) {
  const name = useId();
  const count = INTEGER_ENCODINGS.length;
  const position = INTEGER_ENCODINGS.findIndex((item) => item.id === value);
  const drag = (event: PointerEvent<HTMLFieldSetElement>) => {
    if (!(event.buttons & 1)) return;
    const track = event.currentTarget.getBoundingClientRect();
    const slot = Math.floor(((event.clientX - track.left) / track.width) * count);
    const next = INTEGER_ENCODINGS[Math.max(0, Math.min(count - 1, slot))].id;
    if (next !== value) onChange(next);
  };
  return (
    <fieldset
      className={styles.encodings}
      style={{ "--position": position, "--count": count } as CSSProperties}
      aria-label="Interpret the same pattern"
      onPointerMove={drag}
    >
      <span className={styles.thumb} aria-hidden="true" />
      {INTEGER_ENCODINGS.map((item) => (
        <label key={item.id} data-on={item.id === value}>
          <input
            type="radio"
            name={name}
            checked={item.id === value}
            onChange={() => onChange(item.id)}
          />
          {item.label}
        </label>
      ))}
    </fieldset>
  );
}

export function SignedNumberExplorer() {
  const [width, setWidth] = useState<SignedWidth>(4);
  const [raw, setRaw] = useState(11);
  const [encoding, setEncoding] = useState<IntegerEncoding>("twos-complement");
  const value = decodeInteger(raw, width, encoding);
  const mask = bitMask(width);
  const hasTwoZeros = encoding === "sign-magnitude" || encoding === "ones-complement";
  const negativeZero = encoding === "sign-magnitude" ? 2 ** (width - 1) : mask;
  const page = Math.floor(raw / 16) * 16;
  const changeWidth = (next: SignedWidth) => {
    setRaw(raw & bitMask(next));
    setWidth(next);
  };

  return (
    <section
      className={clsx("not-prose", panel.machine, styles.machine)}
      aria-label="Signed number representations"
    >
      <header className={styles.header}>
        <strong>WHAT DO THESE BITS MEAN?</strong>
        <WidthControl width={width} onChange={changeWidth} />
      </header>
      <div className={styles.plate}>
        <EncodingToggle value={encoding} onChange={setEncoding} />
        <BitKeys
          raw={raw}
          width={width}
          label="Stored pattern"
          encoding={encoding}
          onChange={setRaw}
        />
        <div className={clsx(panel.screen, styles.reading)} aria-live="polite">
          <span>{INTEGER_ENCODINGS.find((item) => item.id === encoding)?.label.toUpperCase()}</span>
          <output aria-label="Interpreted value">{displayInteger(value)}</output>
          <code>
            {contribution(raw, width, encoding)} = {displayInteger(value)}
          </code>
        </div>
        <div className={styles.count}>
          <span>COUNT BIT PATTERNS</span>
          <div className={styles.controls}>
            <button
              type="button"
              aria-label="Previous bit pattern"
              onClick={() => setRaw((raw - 1) & mask)}
            >
              −1
            </button>
            <code>{bitPattern(raw, width)}</code>
            <button
              type="button"
              aria-label="Next bit pattern"
              onClick={() => setRaw((raw + 1) & mask)}
            >
              +1
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={mask}
            value={raw}
            aria-label="Stored bit pattern as unsigned number"
            onChange={(event) => setRaw(Number(event.target.value))}
          />
        </div>
        <fieldset className={styles.patterns} aria-label="Sixteen consecutive bit patterns">
          {Array.from({ length: 16 }, (_, index) => page + index).map((pattern) => (
            <button
              type="button"
              key={pattern}
              aria-pressed={pattern === raw}
              onClick={() => setRaw(pattern)}
            >
              <code>{bitPattern(pattern, width)}</code>
              <span>{displayInteger(decodeInteger(pattern, width, encoding))}</span>
            </button>
          ))}
        </fieldset>
        <div className={styles.zeros}>
          <div className={styles.controls}>
            <button type="button" onClick={() => setRaw(0)}>
              +0 · {bitPattern(0, width)}
            </button>
            {hasTwoZeros && (
              <button type="button" onClick={() => setRaw(negativeZero)}>
                −0 · {bitPattern(negativeZero, width)}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
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

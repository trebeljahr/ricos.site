import { type Circuit, type Node, type Wire, moduleInputs, moduleOutputs } from "./logic";
import { builtinCircuit, registerRecognitionComponent } from "./recognition";

export const SEGMENTS = ["a", "b", "c", "d", "e", "f", "g"] as const;
export const DIGIT_COUNTS = [1, 2, 3, 4] as const;
export type DigitCount = (typeof DIGIT_COUNTS)[number];
export const PLACES = ["units", "tens", "hundreds", "thousands"] as const;
const GLYPHS = [
  "abcdef",
  "bc",
  "abdeg",
  "abcdg",
  "bcfg",
  "acdfg",
  "acdefg",
  "abc",
  "abcdefg",
  "abcdfg",
];
export const segmentBits = (digit: number): boolean[] =>
  SEGMENTS.map((s) => (GLYPHS[digit] ?? "").includes(s));
export const unsigned = (bits: readonly boolean[]): number =>
  bits.reduce((n, bit, i) => n + (bit ? 2 ** i : 0), 0);
export const binaryBits = (n: number, width: number): boolean[] =>
  Array.from({ length: width }, (_, bit) => Boolean(n & (2 ** bit)));
export const decimalBits = (n: number, digits: DigitCount): boolean[] => [
  ...Array.from({ length: digits }, (_, digit) =>
    binaryBits(Math.floor(n / 10 ** digit) % 10, 4),
  ).flat(),
  n >= 10 ** digits,
];
export const SEGMENT_CONTRACT =
  "Active high: 1 lights its named a–g bar. BCD 10–15 blanks all bars. Decimal digits keep leading zeroes, units at right. Overflow lights OVERFLOW and keeps the least-significant digits. 8 bits: 0–255; 14 bits: 0–16383.";

class Gates {
  nodes: Node[] = [];
  wires: Wire[] = [];
  serial = 0;
  add(id: string, type: Node["type"], label = id, extra: Partial<Node> = {}): string {
    this.nodes.push({
      id,
      type,
      x: 40 + (this.serial % 8) * 230,
      y: 40 + Math.floor(this.serial++ / 8) * 190,
      label,
      ...extra,
    });
    return id;
  }
  connect(from: string, to: string, input = 0, output = 0): void {
    this.wires.push({ id: `${from}:${output}>${to}:${input}`, from, to, input, output });
  }
  gate(type: "not" | "and" | "or", inputs: string[]): string {
    const id = this.add(`g${this.serial}`, type, type.toUpperCase());
    inputs.forEach((from, i) => {
      this.connect(from, id, i);
    });
    return id;
  }
  reduce(type: "and" | "or", inputs: string[]): string {
    return inputs.length
      ? inputs.slice(1).reduce((a, b) => this.gate(type, [a, b]), inputs[0])
      : this.add(`zero${this.serial}`, "ground", "0");
  }
  finish(name: string): Circuit {
    const circuit = { name, nodes: this.nodes, wires: this.wires };
    return {
      ...circuit,
      ports: {
        inputs: moduleInputs(circuit).map((n) => n.id),
        outputs: moduleOutputs(circuit).map((n) => n.id),
      },
    };
  }
}

/** Synthesize a four-input truth table into shared literals and sum-of-products gates.
 * Every implicant covers only ON rows; greedy covering affects size, never behavior. */
function truthCircuit(name: string, labels: string[], fn: (n: number) => boolean[]): Circuit {
  const g = new Gates();
  const inputs = Array.from({ length: 4 }, (_, i) => g.add(`b${i}`, "switch", `BCD ${2 ** i}`));
  const inverted = inputs.map((id) => g.gate("not", [id]));
  labels.forEach((label, output) => {
    const on = Array.from({ length: 16 }, (_, n) => n).filter((n) => fn(n)[output]);
    const candidates: { mask: number; value: number; cover: number[] }[] = [];
    for (let mask = 0; mask < 16; mask++)
      for (let value = 0; value < 16; value++) {
        if (value & ~mask) continue;
        const cover = Array.from({ length: 16 }, (_, n) => n).filter((n) => (n & mask) === value);
        if (cover.every((n) => on.includes(n))) candidates.push({ mask, value, cover });
      }
    const remaining = new Set(on);
    const terms: string[] = [];
    while (remaining.size) {
      candidates.sort(
        (a, b) =>
          b.cover.filter((n) => remaining.has(n)).length -
            a.cover.filter((n) => remaining.has(n)).length ||
          a.mask.toString(2).replaceAll("0", "").length -
            b.mask.toString(2).replaceAll("0", "").length,
      );
      const best = candidates[0];
      const literals = inputs.flatMap((id, i) =>
        best.mask & (2 ** i) ? [best.value & (2 ** i) ? id : inverted[i]] : [],
      );
      terms.push(
        literals.length ? g.reduce("and", literals) : g.add(`one${g.serial}`, "high", "1"),
      );
      best.cover.forEach((n) => {
        remaining.delete(n);
      });
    }
    const source = g.reduce("or", terms);
    const out = g.add(`out${output}`, "lamp", label);
    g.connect(source, out);
  });
  return g.finish(name);
}
export const bcdDecoderCircuit = (): Circuit =>
  truthCircuit("BCD to seven segments", [...SEGMENTS], segmentBits);
export const add3Circuit = (): Circuit =>
  truthCircuit("Add 3 if at least 5", ["1", "2", "4", "8"], (n) =>
    binaryBits(n >= 5 ? (n + 3) % 16 : n, 4),
  );
function registered(
  id: string,
  circuit: Circuit,
  evaluate: (bits: boolean[]) => boolean[],
): Circuit {
  registerRecognitionComponent({
    id,
    label: circuit.name,
    symbol: "decoder",
    inputs: moduleInputs(circuit).map((n) => n.label!),
    outputs: moduleOutputs(circuit).map((n) => n.label!),
    evaluate,
  });
  return builtinCircuit(id, circuit, "decoder");
}
export const BCD_DECODER = registered("bcd-seven-segment", bcdDecoderCircuit(), (bits) =>
  segmentBits(unsigned(bits)),
);
export const ADD3 = registered("decimal-add3", add3Circuit(), (bits) => {
  const n = unsigned(bits);
  return binaryBits(n >= 5 ? (n + 3) % 16 : n, 4);
});

/** Combinational double dabble. Each stage corrects BCD nibbles, then shifts
 * the next binary bit into units. Wires implement the shifts; modules contain
 * only NOT/AND/OR gates. A fifth digit retains values through 16383 for overflow. */
export function decimalConversionCircuit(width: 8 | 14, digits: DigitCount): Circuit {
  const g = new Gates();
  const inputs = Array.from({ length: width }, (_, i) => g.add(`b${i}`, "switch", `BIT ${i}`));
  const zero = g.add("zero", "ground", "0");
  type Pin = readonly [string, number];
  let current: Pin[] = Array.from({ length: 20 }, () => [zero, 0] as const);
  for (let stage = 0; stage < width; stage++) {
    const corrected: Pin[] = [];
    for (let digit = 0; digit < 5; digit++) {
      const id = g.add(
        `s${stage}d${digit}`,
        "module",
        `ADD3 · shift ${stage + 1} · ${digit === 4 ? "ten-thousands" : PLACES[digit]}`,
        { module: ADD3, part: "decimal-add3", x: 300 + stage * 400, y: 40 + digit * 250 },
      );
      current.slice(digit * 4, digit * 4 + 4).forEach(([from, output], bit) => {
        g.connect(from, id, bit, output);
      });
      for (let bit = 0; bit < 4; bit++) corrected.push([id, bit]);
    }
    current = [[inputs[width - stage - 1], 0], ...corrected.slice(0, 19)];
  }
  current.slice(0, digits * 4).forEach(([from, output], i) => {
    const id = g.add(`out${i}`, "lamp", `${PLACES[Math.floor(i / 4)]} ${2 ** (i % 4)}`, {
      x: 500 + width * 400,
      y: 40 + i * 150,
    });
    g.connect(from, id, 0, output);
  });
  const overflowBits = current.slice(digits * 4).map(([from, output]) => {
    const id = g.gate("or", [zero, zero]);
    g.wires = g.wires.filter((w) => w.to !== id);
    g.connect(from, id, 0, output);
    g.connect(zero, id, 1);
    return id;
  });
  const overflow = g.reduce("or", overflowBits);
  g.connect(overflow, g.add("overflow", "lamp", "OVERFLOW"));
  return g.finish(`${width}-bit to ${digits} decimal digits`);
}
const converters = new Map<string, Circuit>();
export function decimalConverter(width: 8 | 14, digits: DigitCount): Circuit {
  const key = `${width}:${digits}`;
  if (!converters.has(key))
    converters.set(
      key,
      builtinCircuit(
        `decimal-${width}-${digits}`,
        decimalConversionCircuit(width, digits),
        "decoder",
      ),
    );
  return converters.get(key)!;
}
export function rawSegmentDemo(): Circuit {
  const nodes: Node[] = SEGMENTS.map((s, i) => ({
    id: s,
    type: "switch",
    x: 40 + Math.floor(i / 4) * 210,
    y: 30 + (i % 4) * 155,
    label: s,
  }));
  nodes.push({ id: "digit", type: "sevensegment", x: 550, y: 170, label: "RAW · 1 lights bar" });
  return {
    name: "Seven independent segments",
    nodes,
    wires: SEGMENTS.map((s, i) => ({ id: `${s}>digit`, from: s, to: "digit", input: i })),
  };
}
export function bcdSegmentDemo(): Circuit {
  return {
    name: "BCD digit → decoder → bars",
    nodes: [
      {
        id: "number",
        type: "input4",
        x: 40,
        y: 40,
        label: "BCD 0–9 · 10–15 blank",
        numberValue: 7,
      },
      {
        id: "decoder",
        type: "module",
        module: BCD_DECODER,
        part: "bcd-seven-segment",
        label: "BCD to seven segments",
        x: 290,
        y: 40,
      },
      { id: "digit", type: "sevensegment", x: 710, y: 40, label: "a–g · active high" },
    ],
    wires: [
      ...Array.from({ length: 4 }, (_, bit) => ({
        id: `b${bit}`,
        from: "number",
        output: bit,
        to: "decoder",
        input: bit,
      })),
      ...SEGMENTS.map((s, i) => ({ id: s, from: "decoder", output: i, to: "digit", input: i })),
    ],
  };
}
export function decimalSegmentDemo(
  digits: DigitCount,
  width: 8 | 14 = digits > 2 ? 14 : 8,
): Circuit {
  const nodes: Node[] = [
    {
      id: "number",
      type: width === 8 ? "input8" : "input14",
      x: 40,
      y: 40,
      label: `UNSIGNED · 0–${2 ** width - 1}`,
      numberValue: Math.min(10 ** digits - 1, 255),
    },
    {
      id: "decimal",
      type: "module",
      module: decimalConverter(width, digits),
      x: 500,
      y: 40,
      label: "BINARY → BCD",
    },
    { id: "overflow", type: "lamp", x: 500, y: 650, label: "OVERFLOW" },
    {
      id: "digits",
      type: "module",
      module: decodedDisplayCircuit(digits),
      x: 940,
      y: 40,
      label: "DECIMAL · leading zeroes",
    },
  ];
  const wires: Wire[] = Array.from({ length: width }, (_, bit) => ({
    id: `b${bit}`,
    from: "number",
    output: bit,
    to: "decimal",
    input: bit,
  }));
  wires.push({ id: "overflow", from: "decimal", output: digits * 4, to: "overflow", input: 0 });
  for (let bit = 0; bit < digits * 4; bit++)
    wires.push({ id: `digit${bit}`, from: "decimal", output: bit, to: "digits", input: bit });
  return { name: `${digits} decimal digits · leading zeroes · overflow wraps`, nodes, wires };
}

/** A display package accepts one BCD nibble per place. Unfold/enter it to
 * access every decoder and its seven physical logical segment connections. */
export function decodedDisplayCircuit(digits: DigitCount): Circuit {
  const g = new Gates();
  for (let digit = 0; digit < digits; digit++) {
    for (let bit = 0; bit < 4; bit++)
      g.add(`in${digit * 4 + bit}`, "switch", `${PLACES[digit]} ${2 ** bit}`, {
        x: 40,
        y: 40 + (digit * 4 + bit) * 155,
      });
    const id = g.add(`decode${digit}`, "module", `${PLACES[digit]} BCD`, {
      module: BCD_DECODER,
      part: "bcd-seven-segment",
      x: 400,
      y: 40 + digit * 380,
    });
    for (let bit = 0; bit < 4; bit++) g.connect(`in${digit * 4 + bit}`, id, bit);
    g.add(`raw${digit}`, "sevensegment", `${PLACES[digit]} a–g`, { x: 850, y: 40 + digit * 380 });
    SEGMENTS.forEach((_, bit) => {
      g.connect(id, `raw${digit}`, bit, bit);
    });
  }
  return builtinCircuit(
    `bcd-display-package-${digits}`,
    g.finish(`${digits}-digit BCD display · open for a–g`),
    "decoder",
  );
}

import { type Circuit, initialSnapshot, moduleInputs, moduleOutputs, step } from "../../logic";
import {
  ADD3,
  add3Circuit,
  BCD_DECODER,
  bcdDecoderCircuit,
  binaryBits,
  DIGIT_COUNTS,
  type DigitCount,
  decimalBits,
  decimalConversionCircuit,
  PLACES,
  rawSegmentDemo,
  SEGMENTS,
  segmentBits,
  unsigned,
} from "../../sevenSegment";
import type { Level } from "../types";
import { constructionHints } from "./constructionHints";

const boundaries = [
  0, 1, 8, 9, 10, 11, 98, 99, 100, 101, 254, 255, 256, 998, 999, 1000, 9998, 9999, 10000, 16382,
  16383,
];
export const decimalRows = (width: 8 | 14): boolean[][] =>
  [
    ...new Set([
      ...boundaries.filter((n) => n < 2 ** width),
      ...Array.from({ length: 48 }, (_, i) => (i * 7919 + 31) % 2 ** width),
    ]),
  ].map((n) => binaryBits(n, width));
const ports = (c: Circuit) => ({
  inputs: moduleInputs(c).map((n) => ({ id: n.id, label: n.label! })),
  outputs: moduleOutputs(c).map((n) => ({ id: n.id, label: n.label! })),
});
const raw = rawSegmentDemo();
const rawLevel: Level = {
  id: "raw-seven-segment",
  title: "Wire seven independent bars",
  section: "Decimal displays",
  optional: true,
  goal: "Connect each switch a–g to its matching bar.",
  palette: [],
  start: () => ({ circuit: { ...raw, wires: [] }, locked: raw.nodes.map((n) => n.id) }),
  reference: rawSegmentDemo,
  spec: {
    kind: "custom",
    describe: "Every combination of seven segment switches (128 cases)",
    grade: (circuit) => {
      if (
        SEGMENTS.some(
          (_, i) => circuit.wires.filter((w) => w.to === "digit" && w.input === i).length !== 1,
        )
      )
        return { pass: false, summary: "Connect each of the seven pins exactly once." };
      for (let n = 0; n < 128; n++) {
        const bits = binaryBits(n, 7);
        const snapshot = step(
          circuit,
          initialSnapshot(),
          false,
          {},
          Object.fromEntries(SEGMENTS.map((s, i) => [s, bits[i]])),
        );
        if (SEGMENTS.some((_, i) => snapshot.outputs.digit?.[i] !== bits[i]))
          return { pass: false, summary: "A bar follows the wrong switch. Check the a–g map." };
      }
      return {
        pass: true,
        summary: "All seven bars follow their own switches in all 128 combinations.",
      };
    },
  },
  hints: constructionHints(
    "Each segment is an independent output: a is top, b upper right, c lower right, d bottom, e lower left, f upper left, g middle.",
    "Locate the a input on the display. Connect it to switch a, then repeat for b–g.",
    "Each switch goes straight to the bar with the same letter.",
    "Turn on a and g together. Only the top and middle bars should light.",
  ),
};
const decoder: Level = {
  id: "bcd-seven-segment",
  title: "Decode one BCD digit",
  section: "Decimal displays",
  optional: true,
  goal: "Turn BCD weights 1, 2, 4, 8 into bars a–g for 0–9, and blank them for 10–15.",
  spec: { kind: "truth", ...ports(BCD_DECODER), fn: (bits) => segmentBits(unsigned(bits)) },
  palette: ["not", "and", "or", "high", "ground", "sevensegment"],
  reference: bcdDecoderCircuit,
  makes: {
    part: "bcd-seven-segment",
    label: "BCD to seven segments",
    builtIn: { reference: true },
  },
  hints: constructionHints(
    "Each bar has its own truth table over the four BCD input bits. All bars must be off for inputs 10–15.",
    "Start with one bar. List the decimal digits that light it, and express those rows using AND, OR, and NOT.",
    "Treat each bar as its own function: detect every digit that lights it and OR those detections.",
    "Compare 1 with 8, then try 10 and 15. Eight lights every bar; invalid BCD values light none.",
  ),
};
const correction: Level = {
  id: "decimal-add3",
  title: "Correct a decimal nibble before shifting",
  section: "Decimal displays",
  optional: true,
  goal: "Keep inputs 0–4 as they are and add three to 5–15, wrapping at 16.",
  spec: {
    kind: "truth",
    ...ports(ADD3),
    fn: (bits) => {
      const n = unsigned(bits);
      return binaryBits(n >= 5 ? (n + 3) % 16 : n, 4);
    },
  },
  palette: ["not", "and", "or", "high", "ground"],
  reference: add3Circuit,
  makes: { part: "decimal-add3", label: "Add 3 if at least 5", builtIn: { reference: true } },
  hints: constructionHints(
    "The correction keeps 0–4 and adds three to 5–15, wrapping to four bits.",
    "Write all 16 input rows and the corrected output value beside each row. Work on one output column at a time.",
    "Treat each output bit as its own function of the four inputs, and OR the input values that set it.",
    "Test the boundary 4→4 and 5→8. Also test 15→2 to check the four-bit wrap.",
  ),
};
const conversionLevels = DIGIT_COUNTS.map((digits): Level => {
  const width = digits <= 2 ? 8 : 14;
  const reference = () => decimalConversionCircuit(width, digits);
  return {
    id: `decimal-${width}-${digits}`,
    title: `${width} binary bits to ${digits} BCD digits`,
    section: "Decimal displays",
    optional: true,
    goal: `Convert 0–${2 ** width - 1} to ${digits} BCD ${digits === 1 ? "digit" : "digits"}, units first, with OVERFLOW at ${10 ** digits} and above.`,
    spec: {
      kind: "truth",
      ...ports(reference()),
      fn: (bits) => decimalBits(unsigned(bits), digits),
      ...(width === 14 ? { rows: decimalRows(width) } : {}),
    },
    palette: ["part:decimal-add3", "ground", "or"],
    reference,
    makes: {
      part: `decimal-${width}-${digits}`,
      label: `${width}-bit to ${digits} decimal digits`,
      builtIn: { reference: true },
    },
    hints: constructionHints(
      "Process the binary input from its most significant bit. Correct each decimal nibble before shifting the next input bit in.",
      "Start every decimal nibble at zero. Use one ADD 3 IF AT LEAST 5 block per nibble at each correction stage.",
      "From the top input bit down, correct each decimal digit and then shift the next bit in.",
      "Try 9, 10, and 99. Then test the first value too large for the display: keep its low decimal digits and light OVERFLOW.",
    ),
  };
});
function composedCircuit(digits: DigitCount): Circuit {
  const width = digits <= 2 ? 8 : 14;
  const converter = decimalConversionCircuit(width, digits);
  const nodes = moduleInputs(converter).map((n) => ({ ...n }));
  const circuit: Circuit = { name: `${digits} decoded decimal digits`, nodes, wires: [] };
  nodes.push({
    id: "convert",
    type: "module",
    x: 350,
    y: 40,
    module: converter,
    part: `decimal-${width}-${digits}`,
    label: "BINARY → BCD",
  });
  for (let bit = 0; bit < width; bit++)
    circuit.wires.push({ id: `in${bit}`, from: `b${bit}`, to: "convert", input: bit });
  for (let digit = 0; digit < digits; digit++) {
    nodes.push({
      id: `decode${digit}`,
      type: "module",
      x: 800,
      y: 40 + digit * 360,
      module: BCD_DECODER,
      part: "bcd-seven-segment",
      label: PLACES[digit],
    });
    for (let bit = 0; bit < 4; bit++)
      circuit.wires.push({
        id: `b${digit}:${bit}`,
        from: "convert",
        output: digit * 4 + bit,
        to: `decode${digit}`,
        input: bit,
      });
    SEGMENTS.forEach((s, i) => {
      const id = `d${digit}${s}`;
      nodes.push({
        id,
        type: "lamp",
        x: 1250,
        y: 40 + (digit * 7 + i) * 155,
        label: `${PLACES[digit]} ${s}`,
      });
      circuit.wires.push({ id, from: `decode${digit}`, output: i, to: id, input: 0 });
    });
  }
  nodes.push({
    id: "overflow",
    type: "lamp",
    x: 1250,
    y: 40 + digits * 7 * 155,
    label: "OVERFLOW",
  });
  circuit.wires.push({
    id: "overflow",
    from: "convert",
    output: digits * 4,
    to: "overflow",
    input: 0,
  });
  return {
    ...circuit,
    ports: {
      inputs: moduleInputs(circuit).map((n) => n.id),
      outputs: moduleOutputs(circuit).map((n) => n.id),
    },
  };
}
export const DISPLAY_LEVELS: Level[] = [
  rawLevel,
  decoder,
  correction,
  ...conversionLevels,
  ...DIGIT_COUNTS.map((digits): Level => {
    const width = digits <= 2 ? 8 : 14;
    const reference = () => composedCircuit(digits);
    return {
      id: `seven-segment-${digits}-digits`,
      title: `Compose ${digits} decimal display digits`,
      section: "Decimal displays",
      optional: true,
      goal: `Show a ${width}-bit number on ${digits} seven-segment ${digits === 1 ? "digit" : "digits"}, units first.`,
      spec: {
        kind: "truth",
        ...ports(reference()),
        fn: (bits) => {
          const n = unsigned(bits);
          return [
            ...Array.from({ length: digits }, (_, i) =>
              segmentBits(Math.floor(n / 10 ** i) % 10),
            ).flat(),
            n >= 10 ** digits,
          ];
        },
        rows: decimalRows(width),
      },
      palette: [`part:decimal-${width}-${digits}`, "part:bcd-seven-segment", "sevensegment"],
      reference,
      makes: {
        part: `seven-segment-${digits}-digits`,
        label: `${digits} decimal segment digits`,
        builtIn: { reference: true },
      },
      hints: constructionHints(
        "First convert binary to BCD nibbles. Then decode each nibble independently into seven bars.",
        "Feed the binary input into the converter. Its first four outputs are the units nibble.",
        "Convert the binary input to decimal digits with the BCD converter, then give each digit its own seven-segment decoder.",
        "Try 12: units must show 2 and tens 1. Try zero to check leading zeroes, then a value beyond the display’s range.",
      ),
    };
  }),
];

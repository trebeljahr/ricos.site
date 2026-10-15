// Arithmetic: adders from gates, then bigger adders from smaller ones, and the
// small number tests an ALU needs, as in NandGame's arithmetic section. Each
// adder the reader builds joins the parts list of the levels after it.
import { bitsOf, busPorts, CircuitKit, numberOf, type Source } from "../kit";
import { checkStep, placeStep, wireStep } from "../matcher";
import type { Level } from "../types";
import { A, B, boxed, CHAPTERS, once, port } from "./shared";

const SECTION = "Arithmetic";

const SUM = port("sum", "SUM");
const CARRY = port("carry", "CARRY");
const CIN = port("cin", "CARRY IN", "CIN");
const COUT = port("cout", "CARRY OUT", "COUT");
const A4 = busPorts("a", "A", 4);
const B4 = busPorts("b", "B", 4);
const OUT4 = busPorts("out", "OUT", 4);
const A8 = busPorts("a", "A", 8);
const B8 = busPorts("b", "B", 8);
const OUT8 = busPorts("out", "OUT", 8);
const ZERO = port("zero", "ZERO");
const NEGATIVE = port("neg", "NEGATIVE");

/** Output bits of A + B + CARRY IN for two `width`-bit numbers, CARRY OUT last. */
const addBits =
  (width: number) =>
  (inputs: boolean[]): boolean[] => {
    const a = numberOf(inputs.slice(0, width));
    const b = numberOf(inputs.slice(width, 2 * width));
    const carry = inputs[2 * width] ? 1 : 0;
    return bitsOf(a + b + carry, width + 1);
  };

/**
 * Rows for the 8-bit adder: 16 values of A, 8 of B, each with CARRY IN 0 and
 * 1. They include all zeros, all ones, a carry through every bit (255 + 1),
 * a carry across the middle (15 + 1) and out of the top (128 + 128).
 */
const ADDER8_A = [0, 1, 2, 3, 15, 16, 17, 85, 127, 128, 129, 170, 200, 240, 254, 255];
const ADDER8_B = [0, 1, 15, 16, 127, 128, 170, 255];
const ADDER8_ROWS = ADDER8_A.flatMap((a) =>
  ADDER8_B.flatMap((b) => [false, true].map((carry) => [...bitsOf(a, 8), ...bitsOf(b, 8), carry])),
);

const halfAdder = once(() => {
  const kit = new CircuitKit("Half adder", [A, B], [SUM, CARRY]);
  const n1 = kit.gate("xor", ["a", "b"]);
  const n2 = kit.gate("and", ["a", "b"]);
  return kit.out("sum", n1).out("carry", n2).build();
});

const fullAdder = once(() => {
  const kit = new CircuitKit("Full adder", [A, B, CIN], [SUM, CARRY]);
  const first = kit.part("half-adder", boxed("half-adder"), ["a", "b"], { label: "HALF ADDER" });
  const second = kit.part("half-adder", boxed("half-adder"), [[first, 0], "cin"], {
    label: "HALF ADDER",
  });
  const carry = kit.gate("or", [
    [first, 1],
    [second, 1],
  ]);
  return kit.out("sum", [second, 0]).out("carry", carry).build();
});

const adder4 = once(() => {
  const kit = new CircuitKit("4-bit adder", [...A4, ...B4, CIN], [...OUT4, COUT]);
  let carry: Source = "cin";
  for (let bit = 0; bit < 4; bit++) {
    const adder = kit.part("full-adder", boxed("full-adder"), [`a${bit}`, `b${bit}`, carry], {
      label: "FULL ADDER",
    });
    kit.out(`out${bit}`, [adder, 0]);
    carry = [adder, 1];
  }
  return kit.out("cout", carry).build();
});

const adder8 = once(() => {
  const kit = new CircuitKit("8-bit adder", [...A8, ...B8, CIN], [...OUT8, COUT]);
  const nibble = (low: number, carry: Source) => {
    const bits = [0, 1, 2, 3].map((bit) => bit + low);
    return kit.part(
      "adder4",
      boxed("adder4"),
      [...bits.map((bit) => `a${bit}`), ...bits.map((bit) => `b${bit}`), carry],
      { label: "4-BIT ADDER" },
    );
  };
  const low = nibble(0, "cin");
  const high = nibble(4, [low, 4]);
  for (let bit = 0; bit < 4; bit++) {
    kit.out(`out${bit}`, [low, bit]);
    kit.out(`out${bit + 4}`, [high, bit]);
  }
  return kit.out("cout", [high, 4]).build();
});

const increment4 = once(() => {
  const kit = new CircuitKit("Increment", A4, OUT4);
  let carry: Source = kit.gate("high", []);
  for (let bit = 0; bit < 4; bit++) {
    const half = kit.part("half-adder", boxed("half-adder"), [`a${bit}`, carry], {
      label: "HALF ADDER",
    });
    kit.out(`out${bit}`, [half, 0]);
    carry = [half, 1];
  }
  return kit.build();
});

const subtract4 = once(() => {
  const kit = new CircuitKit("Subtraction", [...A4, ...B4], OUT4);
  const flipped = [0, 1, 2, 3].map((bit) => kit.gate("not", [`b${bit}`]));
  const one = kit.gate("high", []);
  const sum = kit.part(
    "adder4",
    boxed("adder4"),
    [...[0, 1, 2, 3].map((bit) => `a${bit}`), ...flipped, one],
    { label: "4-BIT ADDER" },
  );
  for (let bit = 0; bit < 4; bit++) kit.out(`out${bit}`, [sum, bit]);
  return kit.build();
});

const isZero4 = once(() => {
  const kit = new CircuitKit("Equal to zero", A4, [ZERO]);
  const low = kit.gate("or", ["a0", "a1"]);
  const high = kit.gate("or", ["a2", "a3"]);
  const any = kit.gate("or", [low, high]);
  const zero = kit.gate("not", [any]);
  return kit.out("zero", zero).build();
});

const isNegative4 = once(() => {
  const kit = new CircuitKit("Less than zero", A4, [NEGATIVE]);
  return kit.out("neg", "a3").build();
});

export const halfAdderLevel: Level = {
  id: "half-adder",
  title: "Half adder",
  section: SECTION,
  nandgame: "Half Adder",
  chapter: CHAPTERS.arithmetic,
  goal: "SUM and CARRY show A + B as a two-bit number. CARRY is the high bit.",
  intro:
    "Adding two bits can give 2, and 2 needs two bits: 1 + 1 is 10 in binary. SUM is the low bit of the answer and CARRY the high bit.",
  spec: {
    kind: "truth",
    inputs: [A, B],
    outputs: [SUM, CARRY],
    fn: ([a, b]) => [a !== b, a && b],
  },
  palette: ["nand", "part:not", "part:and", "part:or", "part:xor"],
  makes: { part: "half-adder", label: "HALF ADDER", builtIn: { preset: "Half adder" } },
  reference: halfAdder,
  steps: [
    placeStep(
      "n1",
      "part:xor",
      "SUM is 1 when exactly one input is 1. That is what XOR does. Place an XOR.",
    ),
    wireStep(["a", "b"], "n1", [0, 1], "Wire A and B into the XOR."),
    placeStep("n2", "part:and", "CARRY is 1 only when A and B are both 1. Place an AND."),
    wireStep(
      ["a", "b"],
      "n2",
      [0, 1],
      "Wire A and B into the AND too. One output can feed many inputs.",
    ),
    wireStep("n1", "sum", 0, "Wire the XOR's output into SUM."),
    wireStep("n2", "carry", 0, "Wire the AND's output into CARRY."),
    checkStep("Try all four input pairs. Then press Check."),
  ],
  hints: [
    {
      text: "Look at the SUM column next to the XOR table, and the CARRY column next to the AND table.",
    },
  ],
};

export const fullAdderLevel: Level = {
  id: "full-adder",
  title: "Full adder",
  section: SECTION,
  nandgame: "Full Adder",
  chapter: CHAPTERS.arithmetic,
  goal: "SUM and CARRY show A + B + CARRY IN as a two-bit number.",
  intro:
    "A full adder adds three bits: A, B and the carry from the bit below. The answer is at most 3, so two bits still hold it. Try to build it before you read how.",
  spec: {
    kind: "truth",
    inputs: [A, B, CIN],
    outputs: [SUM, CARRY],
    fn: ([a, b, cin]) => {
      const total = Number(a) + Number(b) + Number(cin);
      return [total % 2 === 1, total >= 2];
    },
  },
  palette: ["nand", "part:not", "part:and", "part:or", "part:xor", "part:half-adder"],
  makes: { part: "full-adder", label: "FULL ADDER", builtIn: { preset: "Full adder" } },
  reference: fullAdder,
  hints: [
    { text: "Add two of the bits first. Then add the third bit to that result." },
    {
      text: "A half adder adds two bits. Use one for A and B. Use a second one for the first SUM and CARRY IN.",
    },
    {
      text: "Each half adder gives a carry. They are never both 1, so an OR of the two carries is CARRY.",
    },
  ],
};

export const adder4Level: Level = {
  id: "adder4",
  title: "4-bit adder",
  section: SECTION,
  nandgame: "Multi-bit Adder",
  chapter: CHAPTERS.arithmetic,
  goal: "OUT0–OUT3 and CARRY OUT show A + B + CARRY IN. Bit 0 is the lowest bit of each number.",
  spec: {
    kind: "truth",
    inputs: [...A4, ...B4, CIN],
    outputs: [...OUT4, COUT],
    fn: addBits(4),
  },
  palette: ["part:half-adder", "part:full-adder"],
  makes: { part: "adder4", label: "4-BIT ADDER", builtIn: { reference: true } },
  reference: adder4,
  hints: [
    {
      text: "Add the numbers the way you add on paper: one column at a time, from bit 0 up. Each column is one full adder.",
    },
    {
      text: "Wire CARRY IN into the full adder for bit 0. Wire each full adder's CARRY into the CARRY IN of the next one. The last CARRY is CARRY OUT.",
    },
  ],
};

export const adder8Level: Level = {
  id: "adder8",
  title: "8-bit adder",
  section: SECTION,
  chapter: CHAPTERS.arithmetic,
  goal: "OUT0–OUT7 and CARRY OUT show A + B + CARRY IN for two 8-bit numbers.",
  spec: {
    kind: "truth",
    inputs: [...A8, ...B8, CIN],
    outputs: [...OUT8, COUT],
    fn: addBits(8),
    rows: ADDER8_ROWS,
  },
  palette: ["part:full-adder", "part:adder4"],
  makes: { part: "adder8", label: "8-BIT ADDER", builtIn: { preset: "8-bit full adder" } },
  reference: adder8,
  hints: [
    {
      text: "Two 4-bit adders make an 8-bit adder. One adds bits 0 to 3, the other bits 4 to 7.",
    },
    {
      text: "The CARRY OUT of the low adder goes into the CARRY IN of the high adder.",
    },
  ],
};

export const increment4Level: Level = {
  id: "increment4",
  title: "Increment",
  section: SECTION,
  nandgame: "Increment",
  chapter: CHAPTERS.arithmetic,
  goal: "OUT0–OUT3 show A + 1. After 15 comes 0: the carry out of bit 3 is dropped.",
  intro:
    "Adding 1 needs a constant 1. A HIGH part gives 1 all the time, and a GROUND part gives 0.",
  spec: {
    kind: "truth",
    inputs: A4,
    outputs: OUT4,
    fn: (inputs) => bitsOf((numberOf(inputs) + 1) % 16, 4),
  },
  palette: ["high", "ground", "part:half-adder", "part:adder4"],
  makes: { part: "increment4", label: "INCREMENT", builtIn: { reference: true } },
  reference: increment4,
  hints: [
    {
      text: "The 1 goes into bit 0. A carry from bit 0 moves into bit 1, and so on up.",
    },
    {
      text: "Your 4-bit adder works: GROUND into every B input, HIGH into CARRY IN.",
    },
    {
      text: "A chain of half adders needs fewer gates. Add HIGH to A0, then add each CARRY to the next bit of A.",
    },
  ],
};

export const subtract4Level: Level = {
  id: "subtract4",
  title: "Subtraction",
  section: SECTION,
  nandgame: "Subtraction",
  chapter: CHAPTERS.arithmetic,
  goal: "OUT0–OUT3 show A − B. Below 0 the result wraps around, so 2 − 3 gives 15.",
  spec: {
    kind: "truth",
    inputs: [...A4, ...B4],
    outputs: OUT4,
    fn: (inputs) => bitsOf((numberOf(inputs.slice(0, 4)) - numberOf(inputs.slice(4)) + 16) % 16, 4),
  },
  palette: ["high", "ground", "part:not", "part:adder4"],
  makes: { part: "subtract4", label: "SUBTRACT", builtIn: { reference: true } },
  reference: subtract4,
  hints: [
    {
      text: "Subtracting B is the same as adding −B. In two's complement, −B is NOT B plus 1.",
    },
    {
      text: "Flip each bit of B with a NOT. Then add A and the flipped B with your 4-bit adder.",
    },
    { text: "The extra 1 needs no second adder: wire HIGH into CARRY IN." },
  ],
};

export const isZero4Level: Level = {
  id: "is-zero4",
  title: "Equal to zero",
  section: SECTION,
  nandgame: "Equal to Zero",
  chapter: CHAPTERS.arithmetic,
  goal: "ZERO is 1 when all four bits of A are 0.",
  spec: {
    kind: "truth",
    inputs: A4,
    outputs: [ZERO],
    fn: (inputs) => [inputs.every((bit) => !bit)],
  },
  palette: ["nand", "part:not", "part:and", "part:or", "part:xor"],
  makes: { part: "is-zero4", label: "IS ZERO", builtIn: { reference: true } },
  reference: isZero4,
  hints: [
    { text: "ZERO is 0 as soon as any bit is 1. Which gate is 1 when any input is 1?" },
    { text: "OR the four bits together, two at a time. Then flip the result with a NOT." },
  ],
};

export const isNegative4Level: Level = {
  id: "is-negative4",
  title: "Less than zero",
  section: SECTION,
  nandgame: "Less than Zero",
  chapter: CHAPTERS.arithmetic,
  goal: "NEGATIVE is 1 when A, read as a two's complement number, is below zero. You get no parts, only wires.",
  intro:
    "Two's complement gives the top bit a negative weight. In 4 bits, A3 counts as −8 instead of 8, and A0–A2 add at most 7 back. So the top bit tells you the sign.",
  spec: {
    kind: "truth",
    inputs: A4,
    outputs: [NEGATIVE],
    fn: (inputs) => [inputs[3]],
  },
  palette: [],
  makes: { part: "is-negative4", label: "IS NEGATIVE", builtIn: { reference: true } },
  reference: isNegative4,
  hints: [
    { text: "Which bit is 1 in every number from −8 to −1, and 0 in every number from 0 to 7?" },
  ],
};

export const ARITHMETIC_LEVELS: Level[] = [
  halfAdderLevel,
  fullAdderLevel,
  adder4Level,
  adder8Level,
  increment4Level,
  subtract4Level,
  isZero4Level,
  isNegative4Level,
];

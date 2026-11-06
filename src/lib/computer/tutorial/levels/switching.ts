// Switching: a selector picks one of two signals, a switch sends one signal to
// one of two places, a decoder turns an address into one select line, and an
// 8-bit selector picks one of two bytes. These are the parts that route data
// inside a processor.
import { bitsOf, busPorts, CircuitKit } from "../kit";
import type { Level, LevelPort } from "../types";
import { constructionHints } from "./constructionHints";
import { A, B, boxed, OUT, once, port } from "./shared";

const SECTION = "Switching";

const SELECT = port("sel", "SELECT");
const DATA = port("data", "DATA");
const TO_A = port("to-a", "TO A");
const TO_B = port("to-b", "TO B");

const BITS = 8;

/** The 8-bit selector's ports in the preset's order: SELECT, then A0, B0, A1, B1, … */
const SELECTOR8_INPUTS: LevelPort[] = [
  port("select", "SELECT"),
  ...Array.from({ length: BITS }, (_, bit) => [
    port(`a${bit}`, `A${bit}`),
    port(`b${bit}`, `B${bit}`),
  ]).flat(),
];
const SELECTOR8_OUTPUTS = busPorts("out", "OUT", BITS);

/**
 * 256 rows for the 8-bit selector: both SELECT values for 128 pairs of bytes.
 * The pairs cover all zeros, all ones, alternating bits, each bit alone in A
 * or in B, and then a fixed pseudo-random run.
 */
function selector8Rows(): boolean[][] {
  const pairs: [number, number][] = [
    [0x00, 0x00],
    [0xff, 0xff],
    [0xff, 0x00],
    [0x00, 0xff],
    [0xaa, 0x55],
    [0x55, 0xaa],
    [0x0f, 0xf0],
    [0xf0, 0x0f],
  ];
  for (let bit = 0; bit < BITS; bit++) pairs.push([1 << bit, 0], [0, 1 << bit]);
  let seed = 0x2f6b;
  const nextByte = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return (seed >>> 16) & 0xff;
  };
  while (pairs.length < 128) pairs.push([nextByte(), nextByte()]);
  return pairs.flatMap(([a, b]) => {
    const as = bitsOf(a, BITS);
    const bs = bitsOf(b, BITS);
    const data = as.flatMap((bit, index) => [bit, bs[index]]);
    return [false, true].map((select) => [select, ...data]);
  });
}

const selector = once(() => {
  const kit = new CircuitKit("Selector", [SELECT, A, B], [OUT]);
  const n1 = kit.gate("not", ["sel"]);
  const n2 = kit.gate("and", ["a", n1]);
  const n3 = kit.gate("and", ["b", "sel"]);
  const n4 = kit.gate("or", [n2, n3]);
  return kit.out("out", n4).build();
});

const switchPart = once(() => {
  const kit = new CircuitKit("Switch", [SELECT, DATA], [TO_A, TO_B]);
  const n1 = kit.gate("not", ["sel"]);
  const n2 = kit.gate("and", ["data", n1]);
  const n3 = kit.gate("and", ["data", "sel"]);
  return kit.out("to-a", n2).out("to-b", n3).build();
});

const decoder = once(() => {
  const kit = new CircuitKit("Decoder", busPorts("a", "A", 2), busPorts("y", "Y", 4));
  const n1 = kit.gate("not", ["a1"]);
  const low = kit.part("switch", boxed("switch"), ["a0", n1], { label: "SWITCH" });
  const high = kit.part("switch", boxed("switch"), ["a0", "a1"], { label: "SWITCH" });
  return kit
    .out("y0", [low, 0])
    .out("y1", [low, 1])
    .out("y2", [high, 0])
    .out("y3", [high, 1])
    .build();
});

const selector8 = once(() => {
  const kit = new CircuitKit("8-bit selector", SELECTOR8_INPUTS, SELECTOR8_OUTPUTS);
  const part = boxed("selector");
  for (let bit = 0; bit < BITS; bit++) {
    const id = kit.part("selector", part, ["select", `a${bit}`, `b${bit}`], {
      label: "SELECTOR",
    });
    kit.out(`out${bit}`, [id, 0]);
  }
  return kit.build();
});

export const selectorLevel: Level = {
  id: "selector",
  title: "Selector",
  section: SECTION,
  goal: "OUT copies A when SELECT is 0 and B when SELECT is 1.",
  spec: {
    kind: "truth",
    inputs: [SELECT, A, B],
    outputs: [OUT],
    fn: ([select, a, b]) => [select ? b : a],
  },
  palette: ["nand", "part:not", "part:and", "part:or", "part:xor"],
  makes: { part: "selector", label: "SELECTOR", builtIn: { reference: true } },
  reference: selector,
  hints: constructionHints(
    "A control signal permits one data path at a time. The unselected input must have no effect.",
    "When SELECT is 0, gate A through. When SELECT is 1, gate B through.",
    "AND each input with its own select condition, then OR the two results.",
    "Use A=1 and B=0, then change SELECT. Repeat with A=0 and B=1 to check both paths.",
  ),
};

export const switchLevel: Level = {
  id: "switch",
  title: "Switch",
  section: SECTION,
  goal: "DATA goes to TO A when SELECT is 0 and to TO B when SELECT is 1.",
  spec: {
    kind: "truth",
    inputs: [SELECT, DATA],
    outputs: [TO_A, TO_B],
    fn: ([select, data]) => [data && !select, data && select],
  },
  palette: ["nand", "part:not", "part:and", "part:or", "part:xor"],
  makes: { part: "switch", label: "SWITCH", builtIn: { reference: true } },
  reference: switchPart,
  hints: constructionHints(
    "One DATA input takes either of two paths. The inactive output must stay 0.",
    "Form two conditions: SELECT for TO B, and NOT SELECT for TO A.",
    "AND DATA with SELECT for one output and with NOT SELECT for the other.",
    "Set DATA to 1 and switch SELECT. Then set DATA to 0: neither output should light.",
  ),
};

export const decoderLevel: Level = {
  id: "decoder",
  title: "Decoder",
  section: SECTION,
  goal: "Only the Y output numbered by A1 A0 is 1.",
  intro:
    "The truth table lists every address on A1 A0 and the one Y output that must light. Wire the circuit so that every row matches.",
  spec: {
    kind: "truth",
    inputs: busPorts("a", "A", 2),
    outputs: busPorts("y", "Y", 4),
    fn: ([a0, a1]) => {
      const address = (a1 ? 2 : 0) + (a0 ? 1 : 0);
      return [0, 1, 2, 3].map((line) => line === address);
    },
    // Read as a binary number, A1 A0 counts 0 to 3 down the table.
    columns: ["a1", "a0"],
  },
  palette: ["nand", "part:not", "part:and", "part:or", "part:xor", "part:switch"],
  makes: { part: "decoder", label: "DECODER", builtIn: { reference: true } },
  reference: decoder,
  hints: constructionHints(
    "Each output recognizes exactly one address. A1 has weight 2 and A0 has weight 1.",
    "Split the rows by A1, then use A0 to choose within each pair.",
    "Send A1 and its inverse through two switches that A0 controls, so each address reaches one output.",
    "Try 00, 01, 10, and 11. Exactly one Y output should light in every case.",
  ),
};

export const selector8Level: Level = {
  id: "selector8",
  title: "8-bit selector",
  section: SECTION,
  goal: "OUT copies the A byte when SELECT is 0 and the B byte when SELECT is 1.",
  spec: {
    kind: "truth",
    inputs: SELECTOR8_INPUTS,
    outputs: SELECTOR8_OUTPUTS,
    fn: ([select, ...data]) =>
      Array.from({ length: BITS }, (_, bit) => data[2 * bit + (select ? 1 : 0)]),
    rows: selector8Rows(),
  },
  palette: ["part:selector"],
  makes: {
    part: "selector8",
    label: "8-BIT SELECTOR",
    builtIn: { preset: "8-bit 2:1 multiplexer" },
  },
  reference: selector8,
  hints: constructionHints(
    "Choosing a byte repeats the one-bit selector eight times. All lanes share one SELECT signal.",
    "Connect A0 and B0 to one selector, then use the same pattern for every remaining bit.",
    "Use one selector per bit, with SELECT shared by all eight.",
    "Try A=85 and B=170. Flip SELECT and check that the whole output byte changes together.",
  ),
};

export const SWITCHING_LEVELS: Level[] = [selectorLevel, switchLevel, decoderLevel, selector8Level];

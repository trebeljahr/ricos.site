// Switching: a selector picks one of two signals, a switch sends one signal to
// one of two places, a decoder turns an address into one select line, and an
// 8-bit selector picks one of two bytes. These are the parts that route data
// inside a processor.
import { bitsOf, busPorts, CircuitKit } from "../kit";
import type { Level, LevelPort } from "../types";
import { constructionHints } from "./constructionHints";
import { A, B, boxed, CHAPTERS, OUT, once, port } from "./shared";

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
  nandgame: "Selector",
  chapter: CHAPTERS.muxes,
  goal: "OUT copies A when SELECT is 0. OUT copies B when SELECT is 1.",
  intro:
    "A selector picks one of two signals and passes it on. A processor uses one wherever a value can come from two places.",
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
    "LEFT = A AND NOT SELECT. RIGHT = B AND SELECT. OUT = LEFT OR RIGHT.",
    "Use A=1 and B=0, then change SELECT. Repeat with A=0 and B=1 to check both paths.",
  ),
};

export const switchLevel: Level = {
  id: "switch",
  title: "Switch",
  section: SECTION,
  nandgame: "Switch",
  chapter: CHAPTERS.muxes,
  goal: "DATA goes to TO A when SELECT is 0 and to TO B when SELECT is 1. The other output stays 0.",
  intro: "A switch is a selector turned around. It has one data input and two outputs.",
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
    "TO A = DATA AND NOT SELECT. TO B = DATA AND SELECT.",
    "Set DATA to 1 and switch SELECT. Then set DATA to 0: neither output should light.",
  ),
};

export const decoderLevel: Level = {
  id: "decoder",
  title: "Decoder",
  section: SECTION,
  chapter: CHAPTERS.muxes,
  goal: "Read A1 A0 as a number from 0 to 3. The Y output with that number is 1, and the other three are 0.",
  intro:
    "A decoder turns an address into one select line. RAM uses one to pick the memory cell that a read or a write goes to.",
  spec: {
    kind: "truth",
    inputs: busPorts("a", "A", 2),
    outputs: busPorts("y", "Y", 4),
    fn: ([a0, a1]) => {
      const address = (a1 ? 2 : 0) + (a0 ? 1 : 0);
      return [0, 1, 2, 3].map((line) => line === address);
    },
  },
  palette: ["nand", "part:not", "part:and", "part:or", "part:xor", "part:switch"],
  makes: { part: "decoder", label: "DECODER", builtIn: { reference: true } },
  reference: decoder,
  hints: constructionHints(
    "Each output recognizes exactly one address. A1 has weight 2 and A0 has weight 1.",
    "Split the rows by A1, then use A0 to choose within each pair.",
    "Use two SWITCH parts. Feed NOT A1 into the first DATA and A1 into the second DATA. Drive both SELECT inputs from A0. The first pair becomes Y0,Y1 and the second Y2,Y3.",
    "Try 00, 01, 10, and 11. Exactly one Y output should light in every case.",
  ),
};

export const selector8Level: Level = {
  id: "selector8",
  title: "8-bit selector",
  section: SECTION,
  chapter: CHAPTERS.muxes,
  goal: "Each OUT bit copies its A bit when SELECT is 0 and its B bit when SELECT is 1.",
  intro:
    "A processor moves whole bytes, so it needs selectors eight bits wide. One SELECT line drives all eight bits. The inputs come in pairs, A0 and B0 first, so each bit's two choices sit together.",
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
    "For each bit i, connect SELECT, Ai, and Bi to one SELECTOR, then its output to OUTi. Do not connect one bit’s output to another bit’s data input.",
    "Try A=85 and B=170. Flip SELECT and check that the whole output byte changes together.",
  ),
};

export const SWITCHING_LEVELS: Level[] = [selectorLevel, switchLevel, decoderLevel, selector8Level];

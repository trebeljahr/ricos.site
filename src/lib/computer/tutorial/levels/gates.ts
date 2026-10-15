// Logic gates: two CMOS levels from transistors, then NOT, AND, OR and XOR from
// NAND, as in NandGame's first section. Each gate the reader builds joins the
// parts list of the levels after it.
import type { Circuit } from "../../logic";
import { CircuitKit, defaultStart } from "../kit";
import { checkStep, placeStep, wireStep } from "../matcher";
import type { Level } from "../types";
import { A, B, CHAPTERS, OUT, once } from "./shared";

const SECTION_CMOS = "Transistors";
const SECTION = "Logic gates";

/** Locked ports plus the VDD and GND rails, where the reference has them. */
const withRails = (level: () => Level) => () => {
  const start = defaultStart(level());
  const reference = level().reference!();
  const rails = reference.nodes.filter((node) => node.id === "vdd" || node.id === "gnd");
  return {
    circuit: { ...start.circuit, nodes: [...start.circuit.nodes, ...rails] },
    locked: [...start.locked, ...rails.map((node) => node.id)],
  };
};

/** The output needs a PMOS path up to VDD and an NMOS path down to GND. */
const cmosRules = (circuit: Circuit) => {
  const types = new Set(circuit.nodes.map((node) => node.type));
  const problems: string[] = [];
  if (!types.has("pmos"))
    problems.push("CMOS pulls the output up through PMOS transistors. Place at least one PMOS.");
  if (!types.has("nmos"))
    problems.push("CMOS pulls the output down through NMOS transistors. Place at least one NMOS.");
  return problems;
};

const cmosNot = once(() => {
  const kit = new CircuitKit("NOT from transistors", [A], [OUT]);
  kit.gate("high", [], { id: "vdd", label: "VDD" });
  kit.gate("ground", [], { id: "gnd", label: "GND" });
  const up = kit.gate("pmos", ["a", "vdd"], { label: "PMOS" });
  const down = kit.gate("nmos", ["a", "gnd"], { label: "NMOS" });
  const join = kit.gate("junction", [up, down], { label: "OUTPUT NODE" });
  return kit.out("out", join).build();
});

const cmosNand = once(() => {
  const kit = new CircuitKit("NAND from transistors", [A, B], [OUT]);
  kit.gate("high", [], { id: "vdd", label: "VDD" });
  kit.gate("ground", [], { id: "gnd", label: "GND" });
  const upA = kit.gate("pmos", ["a", "vdd"], { label: "PMOS A" });
  const upB = kit.gate("pmos", ["b", "vdd"], { label: "PMOS B" });
  const downB = kit.gate("nmos", ["b", "gnd"], { label: "NMOS B" });
  const downA = kit.gate("nmos", ["a", downB], { label: "NMOS A" });
  const pullUp = kit.gate("junction", [upA, upB], { label: "PULL-UP" });
  const join = kit.gate("junction", [pullUp, downA], { label: "OUTPUT NODE" });
  return kit.out("out", join).build();
});

const notGate = once(() => {
  const kit = new CircuitKit("NOT from NAND", [A], [OUT]);
  const n1 = kit.gate("nand", ["a", "a"]);
  return kit.out("out", n1).build();
});

const andGate = once(() => {
  const kit = new CircuitKit("AND from NAND", [A, B], [OUT]);
  const n1 = kit.gate("nand", ["a", "b"]);
  const n2 = kit.gate("not", [n1]);
  return kit.out("out", n2).build();
});

const orGate = once(() => {
  const kit = new CircuitKit("OR from NAND", [A, B], [OUT]);
  const n1 = kit.gate("not", ["a"]);
  const n2 = kit.gate("not", ["b"]);
  const n3 = kit.gate("nand", [n1, n2]);
  return kit.out("out", n3).build();
});

const xorGate = once(() => {
  const kit = new CircuitKit("XOR from NAND", [A, B], [OUT]);
  const n1 = kit.gate("nand", ["a", "b"]);
  const n2 = kit.gate("nand", ["a", n1]);
  const n3 = kit.gate("nand", ["b", n1]);
  const n4 = kit.gate("nand", [n2, n3]);
  return kit.out("out", n4).build();
});

const norGate = once(() => {
  const kit = new CircuitKit("NOR from NAND", [A, B], [OUT]);
  const n1 = kit.gate("or", ["a", "b"]);
  const n2 = kit.gate("not", [n1]);
  return kit.out("out", n2).build();
});

export const cmosNotLevel: Level = {
  id: "cmos-not",
  title: "NOT from transistors",
  section: SECTION_CMOS,
  chapter: CHAPTERS.transistors,
  goal: "OUT is the opposite of A. Build it from one PMOS and one NMOS transistor.",
  intro:
    "A PMOS transistor conducts when its gate input is 0. An NMOS transistor conducts when its gate input is 1. Put one between VDD and the output, and one between the output and GND.",
  spec: { kind: "truth", inputs: [A], outputs: [OUT], fn: ([a]) => [!a] },
  palette: ["pmos", "nmos", "junction"],
  start: withRails(() => cmosNotLevel),
  reference: cmosNot,
  rules: cmosRules,
  steps: [
    placeStep(
      "n1",
      "pmos",
      "Drag a PMOS transistor onto the board. It will connect VDD to the output.",
    ),
    wireStep(
      ["a", "vdd"],
      "n1",
      [0, 1],
      "Wire A into the PMOS gate input (the top dot) and VDD into its source input.",
    ),
    placeStep(
      "n2",
      "nmos",
      "Now drag an NMOS transistor onto the board. It will connect the output to GND.",
    ),
    wireStep(
      ["a", "gnd"],
      "n2",
      [0, 1],
      "Wire A into the NMOS gate input and GND into its source input.",
    ),
    placeStep(
      "n3",
      "junction",
      "Both transistors drive the same wire. Place a JUNCTION to join them.",
    ),
    wireStep(
      ["n1", "n2"],
      "n3",
      [0, 1],
      "Wire the PMOS output and the NMOS output into the junction.",
    ),
    wireStep("n3", "out", 0, "Wire the junction into OUT."),
    checkStep("Flip A to try it. Then press Check."),
  ],
  hints: [
    {
      text: "When A is 0, the PMOS conducts and connects VDD to OUT. When A is 1, the NMOS conducts and connects OUT to GND.",
    },
  ],
  optional: true,
};

export const cmosNandLevel: Level = {
  id: "cmos-nand",
  title: "NAND from transistors",
  section: SECTION_CMOS,
  chapter: CHAPTERS.transistors,
  goal: "OUT is 0 only when A and B are both 1. Use two PMOS and two NMOS transistors.",
  intro:
    "Two PMOS transistors side by side pull OUT up when either input is 0. Two NMOS transistors in a row pull OUT down only when both inputs are 1.",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [!(a && b)] },
  palette: ["pmos", "nmos", "junction"],
  makes: { part: "nand", label: "NAND", builtIn: { gate: "nand" } },
  start: withRails(() => cmosNandLevel),
  reference: cmosNand,
  rules: cmosRules,
  hints: [
    {
      text: "Chain the NMOS transistors: the output of the first is the source of the second. Current reaches GND only when both conduct.",
    },
    {
      text: "Join the two PMOS outputs with a junction, then join that with the NMOS chain.",
    },
  ],
  optional: true,
};

export const notLevel: Level = {
  id: "not",
  title: "NOT",
  section: SECTION,
  nandgame: "Invert",
  chapter: CHAPTERS.universal,
  goal: "OUT is the opposite of A. You have one kind of part: NAND.",
  intro:
    "Every gate in a computer can be built from NAND gates alone. This first level shows the trick that makes it work.",
  spec: { kind: "truth", inputs: [A], outputs: [OUT], fn: ([a]) => [!a] },
  palette: ["nand"],
  makes: { part: "not", label: "NOT", builtIn: { gate: "not" } },
  reference: notGate,
  steps: [
    placeStep("n1", "nand", "Drag a NAND gate from the parts list onto the board."),
    wireStep(
      ["a", "a"],
      "n1",
      [0, 1],
      "Wire A into both inputs of the NAND. Drag from the dot on A's right side to an input dot on the NAND.",
    ),
    wireStep("n1", "out", 0, "Wire the NAND's output into OUT."),
    checkStep("Flip A on and off to watch OUT. Then press Check."),
  ],
  hints: [{ text: "Look at the NAND rows where both inputs are the same." }],
};

export const andLevel: Level = {
  id: "and",
  title: "AND",
  section: SECTION,
  nandgame: "And",
  chapter: CHAPTERS.universal,
  goal: "OUT is 1 only when A and B are both 1.",
  intro: "NAND means NOT AND. Your NOT from the last level is in the parts list now.",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [a && b] },
  palette: ["nand", "part:not"],
  makes: { part: "and", label: "AND", builtIn: { gate: "and" } },
  reference: andGate,
  steps: [
    placeStep("n1", "nand", "Place a NAND gate."),
    wireStep(["a", "b"], "n1", [0, 1], "Wire A and B into the NAND."),
    placeStep(
      "n2",
      "part:not",
      "NAND is AND with its output flipped. Place a NOT to flip it back.",
    ),
    wireStep("n1", "n2", 0, "Wire the NAND's output into the NOT."),
    wireStep("n2", "out", 0, "Wire the NOT's output into OUT."),
    checkStep("Try all four input pairs, then press Check."),
  ],
};

export const orLevel: Level = {
  id: "or",
  title: "OR",
  section: SECTION,
  nandgame: "Or",
  chapter: CHAPTERS.universal,
  goal: "OUT is 1 when A, B or both are 1.",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [a || b] },
  palette: ["nand", "part:not", "part:and"],
  makes: { part: "or", label: "OR", builtIn: { gate: "or" } },
  reference: orGate,
  steps: [
    {
      text: "OR is 0 only when both inputs are 0. NAND is 0 only when both inputs are 1. Flip each input with a NOT first.",
      anchor: { kind: "palette", part: "part:not" },
      done: (context) => context.match.has("n1") && context.match.has("n2"),
    },
    wireStep("a", "n1", 0, "Wire A into one NOT."),
    wireStep("b", "n2", 0, "Wire B into the other NOT."),
    {
      text: "Now feed both flipped inputs into a NAND, and the NAND into OUT.",
      anchor: { kind: "palette", part: "nand" },
      done: (context) => context.passing,
    },
  ],
};

export const xorLevel: Level = {
  id: "xor",
  title: "XOR",
  section: SECTION,
  nandgame: "Xor",
  chapter: CHAPTERS.universal,
  goal: "OUT is 1 when exactly one of A and B is 1.",
  intro: "No steps from here on. You have the goal, the truth table and hints when you ask.",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [a !== b] },
  palette: ["nand", "part:not", "part:and", "part:or"],
  makes: { part: "xor", label: "XOR", builtIn: { gate: "xor" } },
  reference: xorGate,
  hints: [
    {
      text: "XOR is 1 when at least one input is 1 and not both are. Which gate says 'at least one'? Which says 'not both'?",
    },
    {
      text: "OR and NAND of the same two inputs, joined by AND, give XOR. Four NAND gates are enough.",
    },
  ],
};

export const norLevel: Level = {
  id: "nor",
  title: "NOR",
  section: SECTION,
  chapter: CHAPTERS.universal,
  goal: "OUT is 1 only when A and B are both 0.",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [!(a || b)] },
  palette: ["nand", "part:not", "part:and", "part:or"],
  makes: { part: "nor", label: "NOR", builtIn: { gate: "nor" } },
  reference: norGate,
  hints: [{ text: "Compare the NOR table with the OR table, row by row." }],
  optional: true,
};

export const GATE_LEVELS: Level[] = [
  cmosNotLevel,
  cmosNandLevel,
  notLevel,
  andLevel,
  orLevel,
  xorLevel,
  norLevel,
];

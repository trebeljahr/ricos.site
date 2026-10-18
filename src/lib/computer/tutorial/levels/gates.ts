// Logic gates: two CMOS levels from transistors, then NOT, AND, OR and XOR from
// NAND, as in NandGame's first section. Each gate the reader builds joins the
// parts list of the levels after it.
import { type Circuit, initialSnapshot, step } from "../../logic";
import { allRows } from "../kit";
import { CircuitKit, defaultStart } from "../kit";
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
    problems.push("CMOS pulls the output up through PMOS transistors. A PMOS path is required.");
  if (!types.has("nmos"))
    problems.push("CMOS pulls the output down through NMOS transistors. An NMOS path is required.");
  // Boolean simulation maps undriven low to false. Check rail reachability
  // separately so a floating or shorted CMOS output cannot pass as logic 0.
  const inputs = circuit.nodes.filter((n) => n.type === "switch");
  const incoming = (id: string, pin: number) =>
    circuit.wires.find((w) => w.to === id && w.input === pin);
  for (const bits of allRows(inputs.length)) {
    const overrides = Object.fromEntries(inputs.map((n, i) => [n.id, bits[i]]));
    const snapshot = step(circuit, initialSnapshot(), false, {}, overrides);
    const rails = (id: string, seen = new Set<string>()): Set<boolean> => {
      if (seen.has(id)) return new Set();
      const next = new Set(seen).add(id);
      const n = circuit.nodes.find((node) => node.id === id);
      if (!n) return new Set();
      if (n.type === "high" || n.type === "ground") return new Set([n.type === "high"]);
      const pins = n.type === "junction" ? [0, 1] : n.type === "lamp" ? [0] : [1];
      if (n.type === "nmos" || n.type === "pmos") {
        const control = incoming(id, 0);
        if (!control || Boolean(snapshot.values[control.from]) !== (n.type === "nmos"))
          return new Set();
      } else if (n.type !== "junction" && n.type !== "lamp") return new Set();
      return new Set(
        pins.flatMap((pin) => {
          const wire = incoming(id, pin);
          return wire ? [...rails(wire.from, next)] : [];
        }),
      );
    };
    const driven = rails("out");
    if (driven.size !== 1) {
      problems.push(
        `For ${inputs.map((n, i) => `${n.label}=${Number(bits[i])}`).join(", ")}, OUT ${driven.size ? "has competing VDD and GND paths" : "has no conducting path to a rail"}. Compare which branches conduct in this case.`,
      );
      break;
    }
  }
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
  goal: "OUT is the opposite of A. Use PMOS, NMOS, junctions and the fixed supply rails.",
  intro:
    "PMOS conducts at gate 0; NMOS conducts at gate 1. Each passes its source signal when enabled. A junction combines branches. This directed switch model omits resistance, capacitance and voltage thresholds. The check requires a driven rail in every case, without competing rails.",
  spec: { kind: "truth", inputs: [A], outputs: [OUT], fn: ([a]) => [!a] },
  palette: ["pmos", "nmos", "junction"],
  start: withRails(() => cmosNotLevel),
  reference: cmosNot,
  rules: cmosRules,
  hints: [
    {
      text: "For each value of A, which transistor conducts? Which rail must be reachable, and which must be isolated?",
    },
  ],
  optional: true,
};

export const cmosNandLevel: Level = {
  id: "cmos-nand",
  title: "NAND from transistors",
  section: SECTION_CMOS,
  chapter: CHAPTERS.transistors,
  goal: "OUT is 0 only when A and B are both 1. Build a driven CMOS output with the available transistors.",
  intro:
    "Use the transistor conduction rules from the inverter challenge. In each input case, OUT must reach the required rail. A floating output and competing high/low rails both fail. Choose the branch topology yourself.",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [!(a && b)] },
  palette: ["pmos", "nmos", "junction"],
  makes: { part: "nand", label: "NAND", builtIn: { gate: "nand" } },
  start: withRails(() => cmosNandLevel),
  reference: cmosNand,
  rules: cmosRules,
  hints: [
    {
      text: "Compare the three high-output rows with the one low-output row. Which conduction conditions must coincide?",
    },
    {
      text: "A chain needs every switch to conduct. Separate branches need only one conducting route. Which rule matches each rail?",
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
    "NAND outputs 0 only when both inputs are 1. Unlike the transistor model, Boolean gates always produce a defined 0 or 1. Choose a circuit that matches both rows.",
  spec: { kind: "truth", inputs: [A], outputs: [OUT], fn: ([a]) => [!a] },
  palette: ["nand"],
  makes: { part: "not", label: "NOT", builtIn: { gate: "not" } },
  reference: notGate,
  hints: [{ text: "Look at the NAND rows where both inputs are the same." }],
};

export const andLevel: Level = {
  id: "and",
  title: "AND",
  section: SECTION,
  nandgame: "And",
  chapter: CHAPTERS.universal,
  goal: "OUT is 1 only when A and B are both 1.",
  intro:
    "A NAND has two inputs and one defined Boolean output. Your learned NOT is available as a reusable part. Compare their behavior with the goal.",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [a && b] },
  palette: ["nand", "part:not"],
  makes: { part: "and", label: "AND", builtIn: { gate: "and" } },
  reference: andGate,
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
};

export const xorLevel: Level = {
  id: "xor",
  title: "XOR",
  section: SECTION,
  nandgame: "Xor",
  chapter: CHAPTERS.universal,
  goal: "OUT is 1 when exactly one of A and B is 1.",
  intro:
    "Equal inputs and different inputs form two useful groups of cases. Design a circuit that distinguishes those groups.",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [a !== b] },
  palette: ["nand", "part:not", "part:and", "part:or"],
  makes: { part: "xor", label: "XOR", builtIn: { gate: "xor" } },
  reference: xorGate,
  hints: [
    {
      text: "XOR is 1 when at least one input is 1 and not both are. Which gate says 'at least one'? Which says 'not both'?",
    },
    {
      text: "Which equal-input case still slips through your circuit? Find a condition that distinguishes it from both different-input cases.",
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

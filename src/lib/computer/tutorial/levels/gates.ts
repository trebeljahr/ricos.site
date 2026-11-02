// Logic gates: two CMOS levels from transistors, then NOT, AND, OR and XOR from
// NAND, as in NandGame's first section. The ladder goes from transistors up, so
// the first level is the first thing a new reader meets. Each gate the reader
// builds joins the parts list of the levels after it.
import { type Circuit, initialSnapshot, step } from "../../logic";
import { allRows, CircuitKit, defaultStart } from "../kit";
import type { Level } from "../types";
import { gateConstructionHints } from "./gateHints";
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

/** The whole reference on the board, with only A left to wire: one idea, not a construction. */
const withOnlyInputsToWire = (level: () => Level) => () => {
  const reference = level().reference!();
  return {
    circuit: { ...reference, wires: reference.wires.filter((wire) => wire.from !== "a") },
    locked: withRails(level)().locked,
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
        `For ${inputs.map((n, i) => `${n.label}=${Number(bits[i])}`).join(", ")}, OUT ${driven.size ? "has competing VDD and GND paths" : "has no conducting path to VDD or GND"}. Compare which branches conduct in this case.`,
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
  goal: "Make lamp OUT the opposite of switch A.",
  intro:
    "A transistor is a switch, and its G dot controls it. PMOS turns on when G is 0 and connects OUT to VDD, which is always 1. NMOS turns on when G is 1 and connects OUT to GND, which is always 0. Draw wires from dot to dot, so A controls both transistors. Flip A to test. In the table, 1 means on and 0 means off.",
  spec: { kind: "truth", inputs: [A], outputs: [OUT], fn: ([a]) => [!a] },
  palette: ["pmos", "nmos", "junction"],
  start: withOnlyInputsToWire(() => cmosNotLevel),
  reference: cmosNot,
  rules: cmosRules,
  hints: [
    {
      title: "Core idea",
      text: "When A is 0, which transistor turns on, and what does OUT connect to? Ask the same when A is 1.",
    },
    {
      title: "Wiring",
      text: "Draw a wire from A's dot to the G dot on PMOS. Draw another from A's dot to the G dot on NMOS.",
    },
    {
      title: "What the check tests",
      text: "OUT must connect to exactly one of VDD and GND in every row. This switch model leaves out resistance, capacitance and voltage thresholds.",
    },
  ],
};

export const cmosNandLevel: Level = {
  id: "cmos-nand",
  title: "NAND from transistors",
  section: SECTION_CMOS,
  chapter: CHAPTERS.transistors,
  goal: "OUT is 0 only when A and B are both 1. Once it works, use the fewest transistors.",
  intro:
    "The rules from the last level still hold, and now you place the transistors. In every row, OUT must connect to VDD or GND, never both and never neither. To join two wires, drag an output or a wire onto another wire. Release at the highlighted target to create a small junction knob.",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [!(a && b)] },
  palette: ["pmos", "nmos", "junction"],
  makes: { part: "nand", label: "NAND", builtIn: { gate: "nand" } },
  start: withRails(() => cmosNandLevel),
  reference: cmosNand,
  sizeGoal: { metric: "transistors", minimum: 4, unit: "transistor" },
  rules: cmosRules,
  hints: [
    {
      text: "Compare the three high-output rows with the one low-output row. Which conduction conditions must coincide?",
    },
    {
      text: "A chain needs every switch to conduct. Separate branches need only one conducting route. Which rule matches each rail?",
    },
    {
      title: "Transistor count",
      text: "The simplest CMOS NAND uses four transistors: two PMOS and two NMOS. Junctions and supply rails do not count.",
    },
    {
      title: "Conduction paths",
      text: "Put the PMOS pair in parallel from VDD and the NMOS pair in series from GND. Each pair has gates controlled by A and B. Join the two paths at OUT.",
    },
  ],
};

export const notLevel: Level = {
  id: "not",
  title: "NOT",
  section: SECTION,
  nandgame: "Invert",
  chapter: CHAPTERS.universal,
  goal: "OUT is the opposite of A, this time built from NAND.",
  intro:
    "From here on you build with NAND instead of transistors. NAND's output is 0 only when both of its inputs are 1. Add NAND to the board, then draw wires from dot to dot.",
  spec: { kind: "truth", inputs: [A], outputs: [OUT], fn: ([a]) => [!a] },
  palette: ["nand"],
  makes: { part: "not", label: "NOT", builtIn: { gate: "not" } },
  reference: notGate,
  // Plain words for a reader who may have skipped the transistors, with the full wiring one request away.
  hints: [
    {
      title: "Core idea",
      text: "You have one signal, A, and NAND has two inputs. What does NAND do when both inputs get the same signal?",
    },
    { title: "Wiring", text: "Wire A to both NAND inputs. Then wire the NAND output to OUT." },
  ],
};

export const andLevel: Level = {
  id: "and",
  title: "AND",
  section: SECTION,
  nandgame: "And",
  chapter: CHAPTERS.universal,
  goal: "OUT is 1 only when A and B are both 1.",
  intro:
    "NAND's output is 0 only when both inputs are 1. Your NOT is now in the parts list. Compare NAND with this goal.",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [a && b] },
  palette: ["nand", "part:not"],
  makes: { part: "and", label: "AND", builtIn: { gate: "and" } },
  reference: andGate,
  hints: gateConstructionHints("nand", "and", { reusableParts: true }),
};

export const orLevel: Level = {
  id: "or",
  title: "OR",
  section: SECTION,
  nandgame: "Or",
  chapter: CHAPTERS.universal,
  goal: "OUT is 1 when A, B or both are 1.",
  intro:
    "NAND's output is 1 when either input is 0. OUT must be 1 when either input is 1. What can your NOT do about that difference?",
  spec: { kind: "truth", inputs: [A, B], outputs: [OUT], fn: ([a, b]) => [a || b] },
  palette: ["nand", "part:not", "part:and"],
  makes: { part: "or", label: "OR", builtIn: { gate: "or" } },
  reference: orGate,
  hints: gateConstructionHints("nand", "or", { reusableParts: true }),
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
  hints: gateConstructionHints("nand", "xor", { reusableParts: true }),
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
  hints: gateConstructionHints("nand", "nor", { reusableParts: true }),
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

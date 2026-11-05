// Logic gates: two CMOS levels from transistors, then NOT, AND, OR and XOR from
// NAND, as in NandGame's first section. The ladder goes from transistors up, so
// the first level is the first thing a new reader meets. Each gate the reader
// builds joins the parts list of the levels after it. The other transistor gates
// are practice off that ladder, for the transistor builder demo and its chapter.
import { layoutCircuit } from "../../circuitLayout";
import { evalGate } from "../../gateLogic";
import { type Circuit, gateBlueprint, initialSnapshot, type LogicGate, step } from "../../logic";
import { nodeHeight } from "../../nodeGeometry";
import { allRows, CircuitKit, defaultStart } from "../kit";
import type { Level } from "../types";
import { gateConstructionHints } from "./gateHints";
import { A, B, CHAPTERS, OUT, once } from "./shared";

const SECTION_CMOS = "Transistors";
const SECTION = "Logic gates";

const RAIL_GAP = 34;

/** Locked ports plus the VDD and GND rails of the reference, stacked under the inputs. */
const withRails = (level: () => Level) => () => {
  const start = defaultStart(level());
  const inputs = start.circuit.nodes.filter((node) => node.type === "switch");
  let y = Math.max(...inputs.map((node) => node.y + nodeHeight(node))) + RAIL_GAP;
  const rails = level().reference!()
    .nodes.filter((node) => node.type === "high" || node.type === "ground")
    .map((node) => {
      const rail = { ...node, x: inputs[0].x, y };
      y += nodeHeight(node) + RAIL_GAP;
      return rail;
    });
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
      // An input holds its wire at one level, so it can feed a source: XOR passes A along.
      if (n.type === "switch") return new Set([Boolean(snapshot.values[id])]);
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
  spec: { kind: "truth", inputs: [A], outputs: [OUT], fn: ([a]) => [!a] },
  palette: ["pmos", "nmos", "junction"],
  start: withRails(() => cmosNotLevel),
  reference: cmosNot,
  rules: cmosRules,
  hints: [
    {
      title: "Core idea",
      text: "PMOS conducts when its G dot is 0. NMOS conducts when its G dot is 1. When A is 0, OUT must reach VDD. When A is 1, OUT must reach GND.",
    },
    {
      title: "Parts",
      text: "Add one PMOS and one NMOS. Wire VDD to the S dot of PMOS and GND to the S dot of NMOS. Wire A to both G dots.",
    },
    {
      title: "Output",
      text: "Wire the D dot of PMOS to OUT. Then drag the D dot of NMOS onto that wire and release at the highlighted target to join them.",
    },
  ],
};

export const cmosNandLevel: Level = {
  id: "cmos-nand",
  title: "NAND from transistors",
  section: SECTION_CMOS,
  chapter: CHAPTERS.transistors,
  goal: "OUT is 0 only when A and B are both 1. Once it works, use the fewest transistors.",
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
      text: "A chain needs every switch to conduct. Separate branches need only one conducting route. Which rule matches each rail? To join two wires, drag an output or a wire onto another wire and release at the highlighted target, which makes a small junction knob.",
    },
    {
      title: "Transistor count",
      text: "The simplest CMOS NAND uses four transistors: two PMOS and two NMOS. Junctions and supply rails do not count.",
    },
    {
      title: "Conduction paths",
      text: "Put the PMOS pair in parallel from VDD and the NMOS pair in series from GND. Each pair has gates controlled by A and B. Join the two paths at OUT: drag an output onto a wire and release at the highlighted target.",
    },
  ],
};

const TWO_STAGES =
  "A stage is a PMOS path up from VDD, an NMOS path down to GND, and one output node between them.";
const SECOND_STAGE =
  "The last stage is the NOT you built: its gates take the first stage's output.";

/** Practice off the ladder: its own family keeps it out of the main levels and their locks. */
const cmosGateLevel = (
  gate: LogicGate,
  goal: string,
  hints: NonNullable<Level["hints"]>,
): Level => {
  const id = `cmos-${gate}`;
  const title = `${gate.toUpperCase()} from transistors`;
  const level: Level = {
    id,
    title,
    section: SECTION_CMOS,
    chapter: CHAPTERS.transistors,
    practice: { family: id, label: title },
    goal,
    spec: {
      kind: "truth",
      inputs: [A, B],
      outputs: [OUT],
      fn: ([a, b]) => [evalGate(gate, a, b)],
    },
    palette: ["pmos", "nmos", "junction"],
    start: withRails(() => level),
    reference: once(() => {
      const circuit = gateBlueprint(gate, "transistor");
      return layoutCircuit({
        ...circuit,
        name: title,
        nodes: circuit.nodes.map((node) => (node.id === "out" ? { ...node, label: "OUT" } : node)),
      });
    }),
    rules: cmosRules,
    hints,
  };
  return level;
};

const cmosAndLevel = cmosGateLevel("and", "OUT is 1 only when A and B are both 1.", [
  { title: "Core idea", text: `Use two stages. ${TWO_STAGES}` },
  {
    title: "First stage",
    text: "Its output is 0 only when A and B are both 1: PMOS A and PMOS B side by side from VDD, NMOS A and NMOS B in a chain to GND.",
  },
  { title: "Last stage", text: SECOND_STAGE },
]);

const cmosOrLevel = cmosGateLevel("or", "OUT is 1 when A, B or both are 1.", [
  { title: "Core idea", text: `Use two stages. ${TWO_STAGES}` },
  {
    title: "First stage",
    text: "Its output is 1 only when A and B are both 0: PMOS A and PMOS B in a chain from VDD, NMOS A and NMOS B side by side to GND.",
  },
  { title: "Last stage", text: SECOND_STAGE },
]);

const cmosNorLevel = cmosGateLevel("nor", "OUT is 1 only when A and B are both 0.", [
  { title: "Core idea", text: TWO_STAGES.replace("A stage is", "This takes one stage:") },
  {
    title: "Conduction paths",
    text: "Put the PMOS pair in a chain from VDD and the NMOS pair side by side to GND. A and B each drive one transistor of each pair.",
  },
]);

const cmosXorLevel = cmosGateLevel("xor", "OUT is 1 when exactly one of A and B is 1.", [
  {
    title: "Core idea",
    text: "A source does not have to be VDD or GND. B can choose which signal reaches OUT: A, or the opposite of A.",
  },
  { title: "First stage", text: "Build a NOT of A." },
  {
    title: "Selector",
    text: "Wire A to the S dot of a PMOS and the first stage's output to the S dot of an NMOS. B drives both G dots. Join both D dots at OUT.",
  },
]);

const cmosXnorLevel = cmosGateLevel("xnor", "OUT is 1 when A and B are equal.", [
  { title: "Core idea", text: "XNOR is the opposite of XOR, so it ends in a NOT." },
  {
    title: "XOR first",
    text: "Build a NOT of A. Then B selects between them: A into the S dot of a PMOS, the NOT of A into the S dot of an NMOS.",
  },
  { title: "Last stage", text: SECOND_STAGE },
]);

export const notLevel: Level = {
  id: "not",
  title: "NOT",
  section: SECTION,
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
  cmosAndLevel,
  cmosOrLevel,
  cmosNorLevel,
  cmosXorLevel,
  cmosXnorLevel,
  notLevel,
  andLevel,
  orLevel,
  xorLevel,
  norLevel,
];

// A whole 4-bit ALU for the chapter on the ALU, built from parts the tutorial
// levels already make. OP1 OP0 = 00 ADD, 01 SUB, 10 AND, 11 OR.
import { range } from "./blockBuilder";
import { layoutCircuit } from "./circuitLayout";
import { type Circuit, inputCount, type Node, outputCount, type Wire } from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";
import { busPorts, CircuitKit } from "./tutorial/kit";
import { CATALOG } from "./tutorial/levels";

const NIBBLE = range(4);
const port = (id: string, label: string) => ({ id, label });

function builtIn(id: string): Circuit {
  const circuit = CATALOG.builtInModule(id);
  if (!circuit) throw new Error(`Unknown circuit part: ${id}`);
  return circuit;
}

/** SUB = 0 adds B, SUB = 1 adds NOT B plus 1. V is signed overflow. */
function addSubtract(): Circuit {
  const kit = new CircuitKit(
    "Add or subtract",
    [port("sub", "SUB"), ...busPorts("a", "A", 4), ...busPorts("b", "B", 4)],
    [...busPorts("sum", "SUM", 4), port("cout", "CARRY"), port("v", "OVERFLOW")],
  );
  const flipped = NIBBLE.map((bit) => kit.gate("xor", [`b${bit}`, "sub"]));
  const adder = kit.part(
    "adder4",
    builtIn("adder4"),
    [...NIBBLE.map((bit) => `a${bit}`), ...flipped, "sub"],
    { label: "4-BIT ADDER" },
  );
  for (const bit of NIBBLE) kit.out(`sum${bit}`, [adder, bit]);
  // Overflow: A and the B that was added share a sign, and the sum's sign differs.
  const sameSigns = kit.gate("xnor", ["a3", flipped[3]]);
  const signChanged = kit.gate("xor", ["a3", [adder, 3]]);
  return kit
    .out("cout", [adder, 4])
    .out("v", kit.gate("and", [sameSigns, signChanged]))
    .build();
}

/** One gate per bit: OUT0 = A0 · B0 and so on. */
function bitwise(gate: "and" | "or", name: string): Circuit {
  const kit = new CircuitKit(
    name,
    [...busPorts("a", "A", 4), ...busPorts("b", "B", 4)],
    busPorts("out", "OUT", 4),
  );
  for (const bit of NIBBLE) kit.out(`out${bit}`, kit.gate(gate, [`a${bit}`, `b${bit}`]));
  return kit.build();
}

/** OP1 picks the sum or a logic result, OP0 picks AND or OR; logic results carry no flags. */
function resultSelect(): Circuit {
  const kit = new CircuitKit(
    "Result select",
    [
      port("op1", "OP1"),
      port("op0", "OP0"),
      ...busPorts("sum", "SUM", 4),
      port("cin", "CARRY"),
      port("vin", "OVERFLOW"),
      ...busPorts("and", "AND", 4),
      ...busPorts("or", "OR", 4),
    ],
    [...busPorts("out", "OUT", 4), port("carry", "CARRY"), port("overflow", "OVERFLOW")],
  );
  const selector = builtIn("selector");
  for (const bit of NIBBLE) {
    const logic = kit.part("selector", selector, ["op0", `and${bit}`, `or${bit}`], {
      label: "SELECTOR",
    });
    kit.out(
      `out${bit}`,
      kit.part("selector", selector, ["op1", `sum${bit}`, logic], { label: "SELECTOR" }),
    );
  }
  const arithmetic = kit.gate("not", ["op1"]);
  return kit
    .out("carry", kit.gate("and", ["cin", arithmetic]))
    .out("overflow", kit.gate("and", ["vin", arithmetic]))
    .build();
}

/** ZERO when every result bit is 0, NEGATIVE is the top bit; CARRY and OVERFLOW pass through. */
function flags(): Circuit {
  const kit = new CircuitKit(
    "Flags",
    [...busPorts("r", "R", 4), port("cin", "CARRY"), port("vin", "OVERFLOW")],
    [
      port("zero", "ZERO"),
      port("negative", "NEGATIVE"),
      port("carry", "CARRY"),
      port("overflow", "OVERFLOW"),
    ],
  );
  const zero = kit.part(
    "is-zero4",
    builtIn("is-zero4"),
    NIBBLE.map((bit) => `r${bit}`),
    { label: "IS ZERO" },
  );
  return kit
    .out("zero", zero)
    .out("negative", "r3")
    .out("carry", "cin")
    .out("overflow", "vin")
    .build();
}

const TRACK = 20;
const MARGIN = 40;

/** Height of input or output pin `index` on a part, as the board draws it. */
function pinY(node: Node, index: number, kind: "input" | "output") {
  const count = kind === "input" ? inputCount(node) : outputCount(node);
  const first = node.type === "module" ? 42 : 40;
  if (node.type === "lamp" || node.type === "switch") return node.y + nodeHeight(node) / 2;
  return node.y + first + (index * (nodeHeight(node) - first - 24)) / Math.max(1, count - 1);
}

/**
 * The whole ALU as boxes: ADD/SUB, AND and OR work on A and B at the same
 * time, RESULT SELECT keeps the one the op code names, and FLAGS reads the
 * result. Every box opens to gates.
 */
export function aluCircuit(a = 6, b = 3): Circuit {
  const module = (id: string, circuit: Circuit, label: string): Node => ({
    id,
    type: "module",
    module: layoutCircuit(circuit),
    label,
    x: 0,
    y: 0,
  });
  const op1: Node = { id: "op1", type: "switch", label: "OP1", value: false, x: 0, y: 0 };
  const op0: Node = { id: "op0", type: "switch", label: "OP0", value: false, x: 0, y: 160 };
  const inputA: Node = {
    id: "a",
    type: "input4",
    label: "A",
    numberValue: a,
    opensToSwitches: "cyan",
    x: 0,
    y: 0,
  };
  const inputB: Node = { ...inputA, id: "b", label: "B", numberValue: b, opensToSwitches: "amber" };
  const addSub = module("addsub", addSubtract(), "ADD / SUBTRACT");
  const and = module("and", bitwise("and", "4-bit AND"), "AND");
  const or = module("or", bitwise("or", "4-bit OR"), "OR");
  const select = module("select", resultSelect(), "RESULT SELECT");
  const flagBox = module("flags", flags(), "FLAGS");
  const display: Node = { id: "result", type: "display8", bits: 4, label: "RESULT", x: 0, y: 0 };
  const lamps = ["zero", "negative", "carry", "overflow"].map(
    (id): Node => ({ id, type: "lamp", label: id.toUpperCase(), x: 0, y: 0 }),
  );

  // Left: the op switches on top, then A, the three units, B at the bottom.
  const leftTracks = 2 + 8;
  const unitX = nodeWidth(inputA) + MARGIN + leftTracks * TRACK + MARGIN;
  addSub.x = and.x = or.x = unitX;
  addSub.y = op0.y + nodeHeight(op0) + 2 * MARGIN;
  and.y = addSub.y + nodeHeight(addSub) + 2 * MARGIN;
  or.y = and.y + nodeHeight(and) + 2 * MARGIN;
  // A's outputs sit above its first unit pin, B's below its last, so each bus runs one way.
  inputA.y = Math.max(
    op0.y + nodeHeight(op0) + MARGIN,
    pinY(addSub, 1, "input") - nodeHeight(inputA) + 24 - MARGIN,
  );
  inputB.y = pinY(or, 7, "input") + MARGIN - 40;

  // Middle: the selector, its sum pins level with the sum outputs.
  const middleTracks = 14 + 2;
  select.x = unitX + nodeWidth(addSub) + MARGIN + middleTracks * TRACK + MARGIN;
  select.y = addSub.y + 42 - (pinY({ ...select, y: 0 }, 2, "input") - 0);

  // Right: the display above the flags, the lamps beside the flags.
  const rightTracks = 6;
  const rightX = select.x + nodeWidth(select) + MARGIN + rightTracks * TRACK + MARGIN;
  display.x = flagBox.x = rightX;
  display.y = select.y - nodeHeight(display) - MARGIN;
  flagBox.y = select.y + 120;
  lamps.forEach((lamp, index) => {
    lamp.x = rightX + nodeWidth(flagBox) + 2 * MARGIN + 3 * TRACK;
    lamp.y =
      pinY(flagBox, 0, "output") - nodeHeight(lamp) / 2 + index * (nodeHeight(lamp) + MARGIN / 2);
  });

  const nodes = [op1, op0, inputA, inputB, addSub, and, or, select, display, flagBox, ...lamps];
  const wires: Wire[] = [];
  const link = (
    from: string,
    output: number,
    to: string,
    input: number,
    color: Wire["color"],
    track?: number,
  ) =>
    wires.push({
      id: `${from}:${output}>${to}:${input}`,
      from,
      output,
      to,
      input,
      color,
      ...(track === undefined ? {} : { runBeforeEnd: MARGIN + track * TRACK }),
    });

  // Left channel, nearest the units first: OP0 to SUB, then A's rails, then B's.
  link("op0", 0, "addsub", 0, "coral", 0);
  for (const bit of NIBBLE) {
    const aTrack = 1 + (3 - bit);
    const bTrack = 5 + bit;
    link("a", bit, "addsub", 1 + bit, "cyan", aTrack);
    link("a", bit, "and", bit, "cyan", aTrack);
    link("a", bit, "or", bit, "cyan", aTrack);
    link("b", bit, "addsub", 5 + bit, "amber", bTrack);
    link("b", bit, "and", 4 + bit, "amber", bTrack);
    link("b", bit, "or", 4 + bit, "amber", bTrack);
  }
  // Middle channel: the op lines nearest the selector, then the results, top one leftmost.
  link("op1", 0, "select", 0, "coral", 0);
  link("op0", 0, "select", 1, "coral", 1);
  const results: [string, number][] = [
    ...range(6).map((output): [string, number] => ["addsub", output]),
    ...NIBBLE.map((output): [string, number] => ["and", output]),
    ...NIBBLE.map((output): [string, number] => ["or", output]),
  ];
  results.forEach(([from, output], index) => {
    link(
      from,
      output,
      "select",
      2 + index,
      from === "addsub" && output > 3 ? "violet" : "lime",
      2 + (results.length - 1 - index),
    );
  });
  // Right channel: each result bit feeds the display and the flags.
  for (const bit of NIBBLE) {
    link("select", bit, "result", bit, "lime", 3 - bit + 2);
    link("select", bit, "flags", bit, "lime", 3 - bit + 2);
  }
  link("select", 4, "flags", 4, "violet", 1);
  link("select", 5, "flags", 5, "violet", 0);
  lamps.forEach((lamp, output) => {
    link("flags", output, lamp.id, 0, "violet", output);
  });
  return { name: "4-bit ALU", nodes, wires, reflow: "column" };
}

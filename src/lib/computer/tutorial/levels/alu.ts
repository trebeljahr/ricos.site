// Arithmetic logic unit: a logic unit that picks one of four results, an ALU
// slice that adds a sum to it, eight slices chained into an 8-bit ALU, and
// the condition test that decides a jump, as in NandGame's ALU section.
import { bitsOf, busPorts, CircuitKit, numberOf, type Source } from "../kit";
import { checkStep, hasWires, placeStep, wireStep } from "../matcher";
import type { HintAnchor, Level, PaletteRef, TutorialContext } from "../types";
import { A, B, boxed, CHAPTERS, OUT, once, port } from "./shared";

const SECTION = "Arithmetic logic unit";

const OP0 = port("op0", "OP0");
const OP1 = port("op1", "OP1");
const CIN = port("cin", "CARRY IN", "CIN");
const COUT = port("cout", "CARRY OUT", "COUT");
const RESULT = port("out", "RESULT");
const A8 = busPorts("a", "A", 8);
const B8 = busPorts("b", "B", 8);
const OUT8 = busPorts("out", "OUT", 8);
const LT = port("lt", "LT");
const EQ = port("eq", "EQ");
const GT = port("gt", "GT");
const X4 = busPorts("x", "X", 4);
const JUMP = port("jump", "JUMP");

const BITS = 8;

/** The op code OP1 OP0 as a number: 0 AND, 1 OR, 2 XOR, 3 the fourth operation. */
const opCode = (op0: boolean, op1: boolean) => (op1 ? 2 : 0) + (op0 ? 1 : 0);

/** One bit of the logic unit: AND, OR, XOR or NOT A. */
const logicBit = (a: boolean, b: boolean, op: number) =>
  [a && b, a || b, a !== b, !a][op] as boolean;

/** Outputs of the 8-bit ALU, CARRY OUT last. CARRY OUT is the sum's carry for every op code. */
function alu8Bits(inputs: boolean[]): boolean[] {
  const a = numberOf(inputs.slice(0, BITS));
  const b = numberOf(inputs.slice(BITS, 2 * BITS));
  const [cin, op0, op1] = inputs.slice(2 * BITS);
  const sum = a + b + (cin ? 1 : 0);
  const result = [a & b, a | b, a ^ b, sum][opCode(op0, op1)];
  return [...bitsOf(result, BITS), sum > 0xff];
}

/**
 * 256 rows for the 8-bit ALU: 32 pairs of bytes, each with CARRY IN 0 and 1,
 * under all four op codes. The pairs cover all zeros, all ones, alternating
 * bits, a carry through every bit (255 + 1), across the middle (15 + 1) and
 * out of the top (128 + 128), each bit added to itself, then a fixed
 * pseudo-random run.
 */
function alu8Rows(): boolean[][] {
  const pairs: [number, number][] = [
    [0x00, 0x00],
    [0xff, 0xff],
    [0xff, 0x00],
    [0x00, 0xff],
    [0xaa, 0x55],
    [0x55, 0xaa],
    [0x0f, 0xf0],
    [0xf0, 0x0f],
    [0xff, 0x01],
    [0x01, 0xff],
    [0x0f, 0x01],
    [0x7f, 0x01],
    [0x80, 0x80],
    [0x64, 0x1b],
    [0xc8, 0x64],
    [0x3c, 0xa5],
  ];
  for (let bit = 0; bit < BITS; bit++) pairs.push([1 << bit, 1 << bit]);
  let seed = 0x41_4c_55;
  const nextByte = () => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    return (seed >>> 16) & 0xff;
  };
  while (pairs.length < 32) pairs.push([nextByte(), nextByte()]);
  return [0, 1, 2, 3].flatMap((op) =>
    pairs.flatMap(([a, b]) =>
      [false, true].map((cin) => [
        ...bitsOf(a, BITS),
        ...bitsOf(b, BITS),
        cin,
        Boolean(op & 1),
        Boolean(op & 2),
      ]),
    ),
  );
}

const logicUnit = once(() => {
  const kit = new CircuitKit("Logic unit", [A, B, OP0, OP1], [OUT]);
  const and = kit.gate("and", ["a", "b"]);
  const or = kit.gate("or", ["a", "b"]);
  const xor = kit.gate("xor", ["a", "b"]);
  const not = kit.gate("not", ["a"]);
  const selector = boxed("selector");
  const low = kit.part("selector", selector, ["op0", and, or], { label: "SELECTOR" });
  const high = kit.part("selector", selector, ["op0", xor, not], { label: "SELECTOR" });
  const pick = kit.part("selector", selector, ["op1", low, high], { label: "SELECTOR" });
  return kit.out("out", pick).build();
});

const aluSlice = once(() => {
  const kit = new CircuitKit("ALU slice", [A, B, CIN, OP0, OP1], [RESULT, COUT]);
  const logic = kit.part("logic-unit", boxed("logic-unit"), ["a", "b", "op0", "op1"], {
    label: "LOGIC UNIT",
  });
  const adder = kit.part("full-adder", boxed("full-adder"), ["a", "b", "cin"], {
    label: "FULL ADDER",
  });
  const add = kit.gate("and", ["op0", "op1"]);
  const pick = kit.part("selector", boxed("selector"), [add, logic, [adder, 0]], {
    label: "SELECTOR",
  });
  return kit.out("out", pick).out("cout", [adder, 1]).build();
});

const alu8 = once(() => {
  const kit = new CircuitKit("8-bit ALU", [...A8, ...B8, CIN, OP0, OP1], [...OUT8, COUT]);
  const slice = boxed("alu-slice");
  let carry: Source = "cin";
  for (let bit = 0; bit < BITS; bit++) {
    const id = kit.part("alu-slice", slice, [`a${bit}`, `b${bit}`, carry, "op0", "op1"], {
      label: "ALU SLICE",
    });
    kit.out(`out${bit}`, [id, 0]);
    carry = [id, 1];
  }
  return kit.out("cout", carry).build();
});

const condition = once(() => {
  const kit = new CircuitKit("Condition", [LT, EQ, GT, ...X4], [JUMP]);
  const bits = X4.map((item) => item.id);
  const zero = kit.part("is-zero4", boxed("is-zero4"), bits, { label: "IS ZERO" });
  const negative = kit.part("is-negative4", boxed("is-negative4"), bits, {
    label: "IS NEGATIVE",
  });
  const notPositive = kit.gate("or", [zero, negative]);
  const positive = kit.gate("not", [notPositive]);
  const less = kit.gate("and", ["lt", negative]);
  const equal = kit.gate("and", ["eq", zero]);
  const greater = kit.gate("and", ["gt", positive]);
  const either = kit.gate("or", [less, equal]);
  const jump = kit.gate("or", [either, greater]);
  return kit.out("jump", jump).build();
});

/** The logic unit's four gates, in reference order, with their palette entries and inputs. */
const LOGIC_GATES: { id: string; part: PaletteRef; inputs: Source[] }[] = [
  { id: "n1", part: "part:and", inputs: ["a", "b"] },
  { id: "n2", part: "part:or", inputs: ["a", "b"] },
  { id: "n3", part: "part:xor", inputs: ["a", "b"] },
  { id: "n4", part: "part:not", inputs: ["a"] },
];

const gateWired = (context: TutorialContext, gate: (typeof LOGIC_GATES)[number]) =>
  hasWires(
    context,
    gate.id,
    gate.inputs.map((from, input) => ({ from, input })),
  );

export const logicUnitLevel: Level = {
  id: "logic-unit",
  title: "Logic unit",
  section: SECTION,
  nandgame: "Logic Unit",
  chapter: CHAPTERS.alu,
  goal: "OP1 and OP0 pick what OUT shows. 00 gives A AND B, 01 gives A OR B, 10 gives A XOR B and 11 gives NOT A.",
  intro:
    "A processor does different jobs on the same two inputs. A two-bit op code says which job to do. Here the jobs are AND, OR, XOR and NOT A.",
  spec: {
    kind: "truth",
    inputs: [A, B, OP0, OP1],
    outputs: [OUT],
    fn: ([a, b, op0, op1]) => [logicBit(a, b, opCode(op0, op1))],
  },
  palette: ["nand", "part:not", "part:and", "part:or", "part:xor", "part:selector"],
  makes: { part: "logic-unit", label: "LOGIC UNIT", builtIn: { reference: true } },
  reference: logicUnit,
  steps: [
    {
      text: "Compute all four results at once. Place an AND, an OR, an XOR and a NOT.",
      anchor: (context): HintAnchor => ({
        kind: "palette",
        part: (LOGIC_GATES.find((gate) => !context.match.has(gate.id)) ?? LOGIC_GATES[0]).part,
      }),
      done: (context) => LOGIC_GATES.every((gate) => context.match.has(gate.id)),
    },
    {
      text: "Wire A and B into the AND, the OR and the XOR. Wire A into the NOT.",
      anchor: (context): HintAnchor | undefined => {
        const open = LOGIC_GATES.find((gate) => !gateWired(context, gate));
        const node = open && context.match.get(open.id);
        return node ? { kind: "input", node, index: 0 } : undefined;
      },
      done: (context) => LOGIC_GATES.every((gate) => gateWired(context, gate)),
    },
    placeStep(
      "n5",
      "part:selector",
      "Place a SELECTOR. With OP0 on its SELECT input, it passes AND when OP0 is 0 and OR when OP0 is 1.",
    ),
    wireStep(
      ["op0", "n1", "n2"],
      "n5",
      [0, 1, 2],
      "Wire OP0 into SELECT, the AND output into A and the OR output into B.",
    ),
    placeStep(
      "n6",
      "part:selector",
      "Place a second SELECTOR. It passes XOR when OP0 is 0 and NOT A when OP0 is 1.",
    ),
    wireStep(
      ["op0", "n3", "n4"],
      "n6",
      [0, 1, 2],
      "Wire OP0 into SELECT, the XOR output into A and the NOT output into B.",
    ),
    placeStep(
      "n7",
      "part:selector",
      "Place a third SELECTOR. OP1 picks which of the first two reaches OUT.",
    ),
    wireStep(
      ["op1", "n5", "n6"],
      "n7",
      [0, 1, 2],
      "Wire OP1 into SELECT, the first selector into A and the second selector into B.",
    ),
    wireStep("n7", "out", 0, "Wire the third selector's output into OUT."),
    checkStep("Try each op code with a few values of A and B. Then press Check."),
  ],
  hints: [
    { text: "Compute all four results at the same time. Then let the op code pick one of them." },
    {
      text: "A SELECTOR picks one of two signals. OP0 picks within each pair: AND or OR, XOR or NOT A. OP1 then picks the pair.",
    },
  ],
};

export const aluSliceLevel: Level = {
  id: "alu-slice",
  title: "ALU slice",
  section: SECTION,
  nandgame: "Arithmetic Unit",
  chapter: CHAPTERS.alu,
  goal: "OP1 and OP0 pick RESULT: 00 gives A AND B, 01 A OR B, 10 A XOR B and 11 the sum bit of A + B + CARRY IN. CARRY OUT is always the carry of A + B + CARRY IN.",
  intro:
    "One ALU slice works on one bit of each number. The next level puts eight slices side by side, with the carry passed from each slice to the next.",
  spec: {
    kind: "truth",
    inputs: [A, B, CIN, OP0, OP1],
    outputs: [RESULT, COUT],
    fn: ([a, b, cin, op0, op1]) => {
      const total = Number(a) + Number(b) + Number(cin);
      const op = opCode(op0, op1);
      return [op === 3 ? total % 2 === 1 : logicBit(a, b, op), total >= 2];
    },
  },
  palette: [
    "part:not",
    "part:and",
    "part:or",
    "part:xor",
    "part:selector",
    "part:full-adder",
    "part:logic-unit",
  ],
  makes: { part: "alu-slice", label: "ALU SLICE", builtIn: { reference: true } },
  reference: aluSlice,
  hints: [
    {
      text: "Your LOGIC UNIT already handles op codes 00, 01 and 10. Only op code 11 needs something new.",
    },
    {
      text: "A FULL ADDER gives the sum bit and the carry. Its CARRY goes straight to CARRY OUT, whatever the op code.",
    },
    {
      text: "A SELECTOR swaps the sum bit in for the logic unit's output. Its SELECT input must be 1 only when OP1 and OP0 are both 1.",
    },
  ],
};

export const alu8Level: Level = {
  id: "alu8",
  title: "8-bit ALU",
  section: SECTION,
  nandgame: "ALU",
  chapter: CHAPTERS.alu,
  goal: "OUT0–OUT7 show the operation that OP1 and OP0 pick, done on all eight bits of A and B: 00 AND, 01 OR, 10 XOR, 11 A + B + CARRY IN. CARRY OUT is the carry out of the 8-bit sum.",
  spec: {
    kind: "truth",
    inputs: [...A8, ...B8, CIN, OP0, OP1],
    outputs: [...OUT8, COUT],
    fn: alu8Bits,
    rows: alu8Rows(),
  },
  palette: ["part:alu-slice"],
  makes: { part: "alu8", label: "8-BIT ALU", builtIn: { preset: "8-bit ALU" } },
  reference: alu8,
  hints: [
    {
      text: "Each bit gets its own ALU slice. The slice for bit 3 takes A3 and B3 and drives OUT3.",
    },
    { text: "Wire OP0 and OP1 into every slice, so all eight do the same operation." },
    {
      text: "Chain the carries as in an adder. CARRY IN goes into the slice for bit 0, each CARRY OUT into the next slice's CARRY IN, and the last one into CARRY OUT.",
    },
  ],
};

export const conditionLevel: Level = {
  id: "condition",
  title: "Condition",
  section: SECTION,
  nandgame: "Condition",
  chapter: CHAPTERS.alu,
  goal: "Read X0–X3 as a two's complement number. JUMP is 1 when LT is 1 and X is below zero, when EQ is 1 and X is zero, or when GT is 1 and X is above zero.",
  intro:
    "A jump instruction sets LT, EQ and GT to say when it jumps: when a result is below zero, zero, above zero, or any mix of these. The control unit uses this part to decide whether the jump happens.",
  spec: {
    kind: "truth",
    inputs: [LT, EQ, GT, ...X4],
    outputs: [JUMP],
    fn: ([lt, eq, gt, ...bits]) => {
      const value = numberOf(bits);
      const signed = value >= 8 ? value - 16 : value;
      return [(lt && signed < 0) || (eq && signed === 0) || (gt && signed > 0)];
    },
  },
  palette: [
    "nand",
    "part:not",
    "part:and",
    "part:or",
    "part:xor",
    "part:is-zero4",
    "part:is-negative4",
  ],
  makes: { part: "condition", label: "CONDITION", builtIn: { reference: true } },
  reference: condition,
  hints: [
    {
      text: "IS ZERO and IS NEGATIVE cover two of the three cases. X is above zero when it is neither zero nor negative.",
    },
    {
      text: "Join each flag with its case through an AND: LT with negative, EQ with zero, GT with above zero. Then OR the three results together.",
    },
  ],
};

export const ALU_LEVELS: Level[] = [logicUnitLevel, aluSliceLevel, alu8Level, conditionLevel];

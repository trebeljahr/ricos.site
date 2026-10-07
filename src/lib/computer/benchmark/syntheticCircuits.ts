// Large synthetic circuits for the engine benchmark. Each builder returns a
// circuit plus the ids of its top-level switches, so a run can toggle inputs.
import {
  type Circuit,
  type GateType,
  type Node,
  PRESETS,
  registerBlock,
  type Wire,
} from "../logic";

export type Synthetic = { circuit: Circuit; switches: string[] };

class Builder {
  readonly nodes: Node[] = [];
  readonly wires: Wire[] = [];
  add(id: string, type: GateType, extra: Partial<Node> = {}) {
    this.nodes.push({ id, type, x: this.nodes.length * 10, y: 0, ...extra });
    return id;
  }
  connect(from: string, to: string, input = 0, output?: number) {
    this.wires.push({ id: `${from}:${output ?? 0}-${to}:${input}`, from, to, input, output });
  }
  gate(id: string, type: GateType, a: string, b?: string) {
    this.add(id, type);
    this.connect(a, id);
    if (b !== undefined) this.connect(b, id, 1);
    return id;
  }
  circuit(name: string): Circuit {
    return { name, nodes: this.nodes, wires: this.wires };
  }
}

/** Ripple-carry adder from single gates: 8 nodes per bit, no feedback. */
export function flatAdder(bits: number): Synthetic {
  const b = new Builder();
  const switches = [b.add("cin", "switch")];
  let carry = "cin";
  for (let i = 0; i < bits; i++) {
    switches.push(b.add(`a${i}`, "switch"), b.add(`b${i}`, "switch"));
    const half = b.gate(`x1-${i}`, "xor", `a${i}`, `b${i}`);
    const sum = b.gate(`x2-${i}`, "xor", half, carry);
    const and1 = b.gate(`n1-${i}`, "and", `a${i}`, `b${i}`);
    const and2 = b.gate(`n2-${i}`, "and", half, carry);
    carry = b.gate(`c-${i}`, "or", and1, and2);
    b.gate(`s${i}`, "lamp", sum);
  }
  b.gate("cout", "lamp", carry);
  return { circuit: b.circuit(`${bits}-bit flat adder`), switches };
}

/** Gated D latches built from NOR gates: 6 nodes per latch, each a feedback loop. */
export function norLatches(count: number): Synthetic {
  const b = new Builder();
  const switches = [b.add("enable", "switch")];
  for (let i = 0; i < count; i++) {
    switches.push(b.add(`d${i}`, "switch"));
    const notD = b.gate(`nd${i}`, "not", `d${i}`);
    const set = b.gate(`set${i}`, "and", `d${i}`, "enable");
    const reset = b.gate(`reset${i}`, "and", notD, "enable");
    b.add(`q${i}`, "nor");
    b.add(`qb${i}`, "nor");
    b.connect(reset, `q${i}`);
    b.connect(`qb${i}`, `q${i}`, 1);
    b.connect(set, `qb${i}`);
    b.connect(`q${i}`, `qb${i}`, 1);
    b.gate(`out${i}`, "lamp", `q${i}`);
  }
  return { circuit: b.circuit(`${count} NOR latches`), switches };
}

/** A chain of folded gate-level modules, each holding further modules. */
export function moduleChain(preset: string, count: number): Synthetic {
  const inner = PRESETS[preset];
  const b = new Builder();
  const ports = inner.nodes.filter((node) => ["switch", "clock", "pulse"].includes(node.type));
  const outs = inner.nodes.filter((node) => node.type === "lamp").length;
  const switches: string[] = [];
  b.add("clock", "clock");
  for (let m = 0; m < count; m++) {
    b.add(`m${m}`, "module", { module: inner });
    ports.forEach((port, p) => {
      if (port.type === "clock") return b.connect("clock", `m${m}`, p);
      // Chain the first output of the previous module into the first input.
      if (p === 0 && m > 0) return b.connect(`m${m - 1}`, `m${m}`, 0, 0);
      switches.push(b.add(`m${m}-in${p}`, "switch"));
      b.connect(`m${m}-in${p}`, `m${m}`, p);
    });
    for (let o = 0; o < outs; o++) b.connect(`m${m}`, b.add(`m${m}-out${o}`, "lamp"), 0, o);
  }
  return { circuit: b.circuit(`${count} × ${preset}`), switches };
}

type AdderState = null;
registerBlock<AdderState>({
  name: "benchmark full adder",
  inputs: ["A", "B", "CARRY IN"],
  outputs: ["SUM", "CARRY"],
  initialState: () => null,
  evaluate: ([a, b, c], state) => ({
    outputs: [(a !== b) !== c, (a && b) || (c && a !== b)],
    nextState: state,
  }),
});
type RegisterState = { q: number; clock: boolean };
/** An 8-bit register: on a rising clock edge with LOAD high, Q takes D. */
registerBlock<RegisterState>({
  name: "benchmark register8",
  inputs: ["CLOCK", "LOAD", ...Array.from({ length: 8 }, (_, bit) => `D${bit}`)],
  outputs: Array.from({ length: 8 }, (_, bit) => `Q${bit}`),
  initialState: () => ({ q: 0, clock: false }),
  evaluate: ([clock, load, ...d], state) => {
    const rising = clock && !state.clock;
    const q = rising && load ? d.reduce((n, bit, i) => n | (Number(bit) << i), 0) : state.q;
    return {
      outputs: Array.from({ length: 8 }, (_, bit) => Boolean((q >> bit) & 1)),
      nextState: q === state.q && clock === state.clock ? state : { q, clock },
    };
  },
});

/** Ripple adder whose bits are behavioural full-adder blocks over the gate form. */
export function blockAdder(bits: number): Synthetic {
  const b = new Builder();
  const switches = [b.add("cin", "switch")];
  let carry: [string, number | undefined] = ["cin", undefined];
  for (let i = 0; i < bits; i++) {
    switches.push(b.add(`a${i}`, "switch"), b.add(`b${i}`, "switch"));
    b.add(`fa${i}`, "module", { module: PRESETS["Full adder"], behaviour: "benchmark full adder" });
    b.connect(`a${i}`, `fa${i}`, 0);
    b.connect(`b${i}`, `fa${i}`, 1);
    b.connect(carry[0], `fa${i}`, 2, carry[1]);
    b.connect(`fa${i}`, b.add(`s${i}`, "lamp"), 0, 0);
    carry = [`fa${i}`, 1];
  }
  b.connect(carry[0], b.add("cout", "lamp"), 0, carry[1]);
  return { circuit: b.circuit(`${bits}-bit block adder`), switches };
}

/** Gate form for the register block: a clock, LOAD and 8 data inputs, 8 outputs. */
export const registerGateForm: Circuit = {
  name: "Register ports",
  nodes: [
    { id: "clock", type: "clock", x: 0, y: 0 },
    { id: "load", type: "switch", x: 0, y: 0 },
    ...Array.from({ length: 8 }, (_, bit): Node => ({ id: `d${bit}`, type: "switch", x: 0, y: 0 })),
    ...Array.from({ length: 8 }, (_, bit): Node => ({ id: `cell${bit}`, type: "dff", x: 0, y: 0 })),
    ...Array.from({ length: 8 }, (_, bit): Node => ({ id: `q${bit}`, type: "lamp", x: 0, y: 0 })),
  ],
  wires: Array.from({ length: 8 }, (_, bit): Wire[] => [
    { id: `d${bit}`, from: `d${bit}`, to: `cell${bit}`, input: 0 },
    { id: `c${bit}`, from: "clock", to: `cell${bit}`, input: 1 },
    { id: `q${bit}`, from: `cell${bit}`, to: `q${bit}`, input: 0 },
  ]).flat(),
};

/** A bank of behavioural registers sharing clock and LOAD, data from switches. */
export function registerBlocks(count: number): Synthetic {
  const b = new Builder();
  b.add("clock", "clock");
  const switches = [b.add("load", "switch")];
  for (let r = 0; r < count; r++) {
    b.add(`r${r}`, "module", { module: registerGateForm, behaviour: "benchmark register8" });
    b.connect("clock", `r${r}`, 0);
    b.connect("load", `r${r}`, 1);
    for (let bit = 0; bit < 8; bit++) {
      switches.push(b.add(`r${r}d${bit}`, "switch"));
      b.connect(`r${r}d${bit}`, `r${r}`, 2 + bit);
      b.connect(`r${r}`, b.add(`r${r}q${bit}`, "lamp"), 0, bit);
    }
  }
  return { circuit: b.circuit(`${count} register blocks`), switches };
}

/** Counts the nodes the engine evaluates: all levels, a behavioural block as 1. */
export function evaluatedNodes(circuit: Circuit): number {
  return circuit.nodes.reduce(
    (total, node) =>
      total +
      (node.type === "module" && node.module && !node.behaviour
        ? 1 + evaluatedNodes(node.module)
        : 1),
    0,
  );
}

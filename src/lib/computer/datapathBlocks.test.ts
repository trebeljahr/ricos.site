import { describe, expect, it } from "vitest";
import { compileProgram, SAMPLE_PROGRAMS } from "../computerStepper";
import {
  alu,
  DATAPATH_KINDS,
  type DatapathKind,
  datapathNode,
  foldBlockState,
  romBytes,
  toBits,
  toNumber,
  unfoldBlockState,
} from "./datapathBlocks";
import {
  activeBlock,
  type Circuit,
  initialSnapshot,
  moduleInputs,
  moduleOutputs,
  type Node,
  type Snapshot,
  step,
  validateCircuit,
} from "./logic";

/** Seeded PRNG (mulberry32), so failures reproduce. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const EDGES = [0, 1, 127, 128, 254, 255];

/** A top-level circuit with one switch per block input and one lamp per output. */
function harness(block: Node, behavioural: boolean): Circuit {
  const node = behavioural ? block : { ...block, behaviour: undefined };
  const ins = moduleInputs(block.module!);
  const outs = moduleOutputs(block.module!);
  return {
    name: "harness",
    nodes: [
      node,
      ...ins.map((_, i): Node => ({ id: `in${i}`, type: "switch", x: 0, y: 0 })),
      ...outs.map((_, i): Node => ({ id: `out${i}`, type: "lamp", x: 0, y: 0 })),
    ],
    wires: [
      ...ins.map((_, i) => ({ id: `w-in${i}`, from: `in${i}`, to: block.id, input: i })),
      ...outs.map((_, i) => ({
        id: `w-out${i}`,
        from: block.id,
        to: `out${i}`,
        input: 0,
        output: i,
      })),
    ],
  };
}

/** Drives the folded block and its gate form side by side and compares lamps. */
class Pair {
  readonly block: Node;
  readonly circuits: [Circuit, Circuit];
  states: [Snapshot, Snapshot] = [initialSnapshot(), initialSnapshot()];
  constructor(kind: DatapathKind, bytes?: number[]) {
    this.block = datapathNode(kind, "dut", 0, 0, bytes);
    this.circuits = [harness(this.block, true), harness(this.block, false)];
    expect(activeBlock(this.block)?.name).toBe(kind);
  }
  /** Applies inputs at the given clock level; returns the folded block's outputs. */
  apply(inputs: boolean[]): boolean[] {
    const overrides = Object.fromEntries(inputs.map((bit, i) => [`in${i}`, bit]));
    this.states = this.states.map((state, i) =>
      step(this.circuits[i], state, false, {}, overrides),
    ) as [Snapshot, Snapshot];
    const [folded, gates] = this.states.map((state) =>
      this.circuits[0].nodes
        .filter((n) => n.type === "lamp")
        .map((n) => Boolean(state.values[n.id])),
    );
    expect(folded).toEqual(gates);
    expect(this.states[1].unstable).toBe(false);
    return folded;
  }
  /** Inputs held, clock low then high (the clock input is the last port). */
  tick(inputs: boolean[]): boolean[] {
    this.apply([...inputs, false]);
    return this.apply([...inputs, true]);
  }
}

describe("datapath blocks", () => {
  it("keeps every gate form inside the import limits and keeps the behaviour", () => {
    for (const kind of DATAPATH_KINDS) {
      const node = datapathNode(kind, "dut", 0, 0);
      const circuit = { name: kind, nodes: [node], wires: [] };
      const validated = validateCircuit(JSON.parse(JSON.stringify(circuit)));
      expect(validated?.nodes[0].behaviour, kind).toBe(kind);
    }
  });

  it("alu8: arithmetic is exhaustive against the stepper's flag rules", { timeout: 60_000 }, () => {
    for (let a = 0; a < 256; a++)
      for (let b = 0; b < 256; b++)
        for (const sub of [false, true]) {
          const { result, carry, zero } = alu(a, b, sub);
          const raw = sub ? a - b : a + b;
          expect(result).toBe(((raw % 256) + 256) % 256);
          expect(carry).toBe(sub ? raw < 0 : raw > 255);
          expect(zero).toBe(result === 0);
        }
  });

  it("alu8: block equals gates on edges and seeded random operands", () => {
    const pair = new Pair("alu8");
    const next = random(1);
    const cases: [number, number][] = EDGES.flatMap((a) =>
      EDGES.map((b): [number, number] => [a, b]),
    );
    for (let i = 0; i < 300; i++) cases.push([Math.floor(next() * 256), Math.floor(next() * 256)]);
    for (const [a, b] of cases)
      for (const sub of [false, true]) {
        const out = pair.apply([...toBits(a, 8), ...toBits(b, 8), sub]);
        const want = alu(a, b, sub);
        expect(toNumber(out.slice(0, 8))).toBe(want.result);
        expect(out.slice(8)).toEqual([want.carry, want.zero]);
      }
  });

  it("register8: block equals gates loading every byte, and holds without LOAD", () => {
    const pair = new Pair("register8");
    for (let value = 0; value < 256; value++) {
      expect(toNumber(pair.tick([...toBits(value, 8), true]))).toBe(value);
      expect(toNumber(pair.tick([...toBits(~value & 255, 8), false]))).toBe(value);
    }
  });

  it("counter8: counts through the wrap, loads, and holds", () => {
    const pair = new Pair("counter8");
    const zero = toBits(0, 8);
    for (let n = 1; n <= 257; n++)
      expect(toNumber(pair.tick([...zero, true, false]))).toBe(n & 255);
    expect(toNumber(pair.tick([...toBits(0xfe, 8), true, true]))).toBe(0xfe); // LOAD beats INC
    expect(toNumber(pair.tick([...zero, false, false]))).toBe(0xfe);
    expect(toNumber(pair.tick([...zero, true, false]))).toBe(0xff);
    expect(toNumber(pair.tick([...zero, true, false]))).toBe(0);
  });

  it("ram16: block equals gates over seeded random reads and writes", () => {
    const pair = new Pair("ram16");
    const model = Array(16).fill(0);
    const next = random(2);
    for (let i = 0; i < 400; i++) {
      const address = Math.floor(next() * 16);
      const data = i < 32 ? EDGES[i % EDGES.length] : Math.floor(next() * 256);
      const write = next() < 0.4;
      const out = pair.tick([...toBits(address, 4), ...toBits(data, 8), write]);
      if (write) model[address] = data;
      expect(toNumber(out), `step ${i}`).toBe(model[address]);
    }
  });

  it("stack16: block equals gates for push, pop, wrap and push-beats-pop", () => {
    const pair = new Pair("stack16");
    const model: number[] = Array(16).fill(0);
    let sp = 0;
    const next = random(3);
    for (let i = 0; i < 300; i++) {
      const data = Math.floor(next() * 256);
      const push = i < 20 || next() < 0.5;
      const pop = i >= 20 && i < 40 ? true : next() < 0.5;
      const out = pair.tick([...toBits(data, 8), push, pop]);
      if (push) {
        model[sp] = data;
        sp = (sp + 1) & 15;
      } else if (pop) sp = (sp - 1) & 15;
      expect(toNumber(out.slice(8)), `sp at ${i}`).toBe(sp);
      expect(toNumber(out.slice(0, 8)), `top at ${i}`).toBe(model[(sp - 1) & 15]);
    }
  });

  it("rom256: block equals gates at every address of a compiled program", () => {
    const { bytes } = compileProgram(SAMPLE_PROGRAMS.LOOP);
    const pair = new Pair("rom256", bytes);
    expect(romBytes(pair.block.module!).slice(0, bytes.length)).toEqual(bytes);
    for (let address = 0; address < 256; address++)
      expect(toNumber(pair.apply(toBits(address, 8)))).toBe(bytes[address] ?? 0);
  });

  it("matches a gate form whose nested rows also run as gates", () => {
    const strip = (circuit: Circuit): Circuit => ({
      ...circuit,
      nodes: circuit.nodes.map((n) =>
        n.module ? { ...n, behaviour: undefined, module: strip(n.module) } : n,
      ),
    });
    const pair = new Pair("ram16");
    pair.circuits[1] = harness({ ...pair.block, module: strip(pair.block.module!) }, false);
    const next = random(4);
    for (let i = 0; i < 40; i++)
      pair.tick([
        ...toBits(Math.floor(next() * 16), 4),
        ...toBits(Math.floor(next() * 256), 8),
        next() < 0.5,
      ]);
  });
});

describe("carrying state across fold and unfold", () => {
  const cases: [DatapathKind, (pair: Pair) => void][] = [
    ["register8", (p) => p.tick([...toBits(0xa5, 8), true])],
    [
      "counter8",
      (p) => {
        for (let i = 0; i < 7; i++) p.tick([...toBits(0, 8), true, false]);
      },
    ],
    [
      "ram16",
      (p) => [3, 9, 15].forEach((a) => p.tick([...toBits(a, 4), ...toBits(a * 17, 8), true])),
    ],
    ["stack16", (p) => [0x11, 0x22, 0x33].forEach((d) => p.tick([...toBits(d, 8), true, false]))],
  ];
  for (const [kind, fill] of cases)
    it(`${kind}: unfolding seeds the gates and folding reads them back`, () => {
      const pair = new Pair(kind);
      fill(pair);
      const state = pair.states[0].blocks?.dut;
      const seeded = unfoldBlockState(pair.block, state);
      expect(foldBlockState(pair.block, seeded)).toEqual(state);
      // Run the gate form from the seeded state: it must keep agreeing with the block.
      pair.states[1] = { ...pair.states[1], modules: { ...pair.states[1].modules, dut: seeded } };
      pair.states[0] = { ...pair.states[0] };
      const inputs = moduleInputs(pair.block.module!).map(() => false);
      pair.apply(inputs);
      expect(foldBlockState(pair.block, pair.states[1].modules.dut)).toEqual(
        pair.states[0].blocks?.dut,
      );
    });

  it("reads gate-level rows of an unfolded RAM row", () => {
    const pair = new Pair("ram16");
    pair.tick([...toBits(5, 4), ...toBits(0x42, 8), true]);
    const state = pair.states[0].blocks?.dut as { bytes: number[] };
    const seeded = unfoldBlockState(pair.block, state);
    const row = pair.block.module!.nodes.find((n) => n.id === "row5")!;
    seeded.modules.row5 = unfoldBlockState(row, seeded.blocks?.row5);
    delete seeded.blocks?.row5;
    expect((foldBlockState(pair.block, seeded) as { bytes: number[] }).bytes[5]).toBe(0x42);
  });

  it("counts ACC ← ACC + 1 through the ALU with the register folded or unfolded", () => {
    for (const gates of [false, true]) {
      const reg = datapathNode("register8", "acc", 0, 0);
      const nodes: Node[] = [
        gates ? { ...reg, behaviour: undefined } : reg,
        datapathNode("alu8", "alu", 0, 0),
        { id: "one", type: "high", x: 0, y: 0 },
        { id: "zero", type: "ground", x: 0, y: 0 },
        { id: "clk", type: "switch", x: 0, y: 0 },
      ];
      const wires = [
        ...Array.from({ length: 8 }, (_, bit) => [
          { id: `q${bit}`, from: "acc", output: bit, to: "alu", input: bit },
          { id: `b${bit}`, from: bit ? "zero" : "one", to: "alu", input: 8 + bit },
          { id: `r${bit}`, from: "alu", output: bit, to: "acc", input: bit },
        ]).flat(),
        { id: "sub", from: "zero", to: "alu", input: 16 },
        { id: "load", from: "one", to: "acc", input: 8 },
        { id: "clock", from: "clk", to: "acc", input: 9 },
      ];
      const circuit: Circuit = { name: "counter", nodes, wires };
      let state = initialSnapshot();
      for (let n = 1; n <= 5; n++)
        for (const clk of [false, true]) {
          state = step(circuit, state, false, {}, { clk });
          expect(state.unstable, `gates=${gates}`).toBe(false);
        }
      expect(toNumber(state.outputs.acc), `gates=${gates}`).toBe(5);
    }
  });
});

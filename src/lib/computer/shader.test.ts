import { describe, expect, it } from "vitest";
import { datapathNode, foldBlockState, toNumber, unfoldBlockState } from "./datapathBlocks";
import {
  activeBlock,
  type Circuit,
  initialSnapshot,
  moduleInputs,
  moduleOutputs,
  type Node,
  type Snapshot,
  step,
} from "./logic";
import {
  compileShader,
  decodeShader,
  disassembleShader,
  LANE_LINES,
  laneNext,
  renderShader,
  SAMPLE_SHADERS,
  SHADER_OPS,
} from "./shader";
import { shaderBytes } from "./shaderBlocks";

/** Seeded PRNG (mulberry32), so failures reproduce. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function allGates(node: Node): Node {
  if (node.type !== "module" || !node.module) return node;
  return {
    ...node,
    behaviour: undefined,
    module: { ...node.module, nodes: node.module.nodes.map(allGates) },
  };
}

/** A top-level circuit with one switch per block input and one lamp per output. */
function harness(block: Node): Circuit {
  const ins = moduleInputs(block.module!);
  const outs = moduleOutputs(block.module!);
  return {
    name: "harness",
    nodes: [
      block,
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

class Runner {
  readonly circuit: Circuit;
  state: Snapshot = initialSnapshot();
  constructor(readonly block: Node) {
    this.circuit = harness(block);
  }
  apply(inputs: boolean[]): boolean[] {
    const overrides = Object.fromEntries(inputs.map((bit, i) => [`in${i}`, bit]));
    this.state = step(this.circuit, this.state, false, {}, overrides);
    expect(this.state.unstable).toBe(false);
    return this.circuit.nodes
      .filter((node) => node.type === "lamp")
      .map((node) => Boolean(this.state.values[node.id]));
  }
}

/** Shader outputs: Y0–2, D0–7, WE, T0–2. */
const read = (out: boolean[]) => ({
  y: toNumber(out.slice(0, 3)),
  pixels: toNumber(out.slice(3, 11)),
  we: out[11],
  t: toNumber(out.slice(12, 15)),
});

/** Ticks a shader (RUN on) and collects the rows it writes, as a screen would. */
function rowsWritten(runner: Runner, count: number) {
  const rows: { y: number; t: number; pixels: number }[] = [];
  for (let guard = 0; rows.length < count && guard < 2000; guard++) {
    const low = read(runner.apply([true, false]));
    if (low.we) rows.push({ y: low.y, t: low.t, pixels: low.pixels });
    runner.apply([true, true]);
  }
  return rows;
}

const shaderNode = (source: string) =>
  datapathNode("shader8", "dut", 0, 0, compileShader(source).bytes);

const CHECKER = [0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55];
const SQUARE = [0, 0, 0x3c, 0x3c, 0x3c, 0x3c, 0, 0];
/** Expected stripe row: pixel x is bit 1 of x + y + t. */
const stripe = (y: number, t: number) =>
  toNumber(Array.from({ length: 8 }, (_, x) => Boolean(((x + y + t) >> 1) & 1)));

describe("compileShader", () => {
  it("encodes opcode, register flag and operand, and appends END", () => {
    const { bytes, instructions } = compileShader("LD x\nxor Y ; comment\n\nadd 5\nSET");
    expect(bytes.slice(0, 5)).toEqual([0x18, 0x49, 0x55, 0xa0, 0x00]);
    expect(bytes).toHaveLength(16);
    expect(instructions.map((i) => i.line)).toEqual([1, 2, 4, 5, 5]);
    expect(instructions.map((i) => disassembleShader(i.byte))).toEqual([
      "LD x",
      "XOR y",
      "ADD 5",
      "SET",
      "END",
    ]);
  });

  it("keeps an explicit END and round-trips every op through the disassembler", () => {
    const source = SHADER_OPS.filter((op) => op.mnemonic !== "END")
      .map((op) => (op.operand ? `${op.mnemonic} 3` : op.mnemonic))
      .concat("END")
      .join("\n");
    const { instructions } = compileShader(source);
    expect(instructions).toHaveLength(SHADER_OPS.length);
    expect(
      compileShader(instructions.map((i) => disassembleShader(i.byte)).join("\n")).bytes,
    ).toEqual(compileShader(source).bytes);
  });

  it.each([
    ["FOO 1", "Line 1: Unknown instruction “FOO”"],
    ["LD", "Line 1: LD needs an operand"],
    ["LD 8", "Line 1: Operand “8” must be x, y, t, p or a number 0–7."],
    ["LD q", "Line 1: Operand “q”"],
    ["SET 1", "Line 1: SET takes no operand."],
    ["LD 1 2", "Line 1: LD takes at most one operand."],
    ["LD 1\nEND\nSET", "Line 3: Nothing runs after END."],
    [Array(16).fill("SET").join("\n"), "No room for the closing END"],
    [Array(17).fill("SET").join("\n"), "Line 17: A shader holds at most 16 instructions"],
  ])("rejects %j", (source, message) => {
    expect(() => compileShader(source)).toThrow(message);
  });

  it("accepts 15 instructions plus END", () => {
    expect(compileShader(Array(15).fill("SET").join("\n")).instructions).toHaveLength(16);
  });
});

describe("lane behaviour", () => {
  const run = (source: string, x: number, y = 0, t = 0, p = false) => {
    let a = 0;
    let pixel = p;
    for (const { byte } of compileShader(source).instructions) {
      ({ a, p: pixel } = laneNext(decodeShader(byte, y, t), x, a, pixel));
    }
    return { a, p: pixel };
  };

  it("computes each op on 3-bit values", () => {
    expect(run("LD 5\nADD 4", 0).a).toBe(1); // wraps at 8
    expect(run("LD 1\nSUB 2", 0).a).toBe(7);
    expect(run("LD 6\nAND 3", 0).a).toBe(2);
    expect(run("LD 4\nOR 1", 0).a).toBe(5);
    expect(run("LD 6\nXOR 5", 0).a).toBe(3);
    expect(run("LD 6\nSHR 1", 0).a).toBe(3);
    expect(run("LD 7\nSHR 3", 0).a).toBe(0);
    expect(run("LD 2\nLT 3", 0).a).toBe(1);
    expect(run("LD 3\nLT 3", 0).a).toBe(0);
    expect(run("LD 3\nEQ 3", 0).a).toBe(1);
    expect(run("LD 4\nEQ 3", 0).a).toBe(0);
  });

  it("reads x per lane, y and t shared, and its own pixel", () => {
    expect(run("LD x", 6).a).toBe(6);
    expect(run("LD y", 6, 3).a).toBe(3);
    expect(run("LD t", 6, 3, 5).a).toBe(5);
    expect(run("LD p", 0, 0, 0, true).a).toBe(1);
    expect(run("LD 3\nSET", 0).p).toBe(true);
    expect(run("LD 2\nSET", 0, 0, 0, true).p).toBe(false);
    expect(run("LD 1\nEND", 0).a).toBe(1); // END leaves A alone
  });

  it("renders the sample shaders", () => {
    const pixels = (source: string, rows = 8) =>
      renderShader(compileShader(source).bytes, rows).map((row) => row.pixels);
    expect(pixels(SAMPLE_SHADERS.CHECKER)).toEqual(CHECKER);
    expect(pixels(SAMPLE_SHADERS.SQUARE)).toEqual(SQUARE);
    const frames = renderShader(compileShader(SAMPLE_SHADERS.STRIPES).bytes, 24);
    for (const { y, t, pixels: row } of frames) expect(row, `y=${y} t=${t}`).toBe(stripe(y, t));
    expect(frames.map((row) => row.t)).toEqual([
      ...Array(8).fill(0),
      ...Array(8).fill(1),
      ...Array(8).fill(2),
    ]);
  });
});

describe("shader8 block", () => {
  it("writes the expected rows, folded and as gates", () => {
    for (const [source, want] of [
      [SAMPLE_SHADERS.CHECKER, CHECKER],
      [SAMPLE_SHADERS.SQUARE, SQUARE],
    ] as const)
      for (const gates of [false, true]) {
        const node = shaderNode(source);
        expect(activeBlock(node)?.name).toBe("shader8");
        const rows = rowsWritten(new Runner(gates ? allGates(node) : node), 8);
        expect(rows.map((r) => r.y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
        expect(
          rows.map((r) => r.pixels),
          `gates=${gates}`,
        ).toEqual(want);
      }
  });

  it("animates the stripes over frames", () => {
    const rows = rowsWritten(new Runner(shaderNode(SAMPLE_SHADERS.STRIPES)), 24);
    for (const { y, t, pixels } of rows) expect(pixels, `y=${y} t=${t}`).toBe(stripe(y, t));
    expect(rows.at(-1)?.t).toBe(2);
  });

  it("holds while RUN is off and keeps WE low", () => {
    const runner = new Runner(shaderNode("END"));
    for (let i = 0; i < 3; i++) {
      runner.apply([false, false]);
      const out = read(runner.apply([false, true]));
      expect(out.we).toBe(false);
      expect(out.y).toBe(0);
    }
    expect(read(runner.apply([true, false])).we).toBe(true);
  });

  it("gates agree with the block on seeded random programs, lanes folded or not", {
    timeout: 60_000,
  }, () => {
    const next = random(7);
    for (let program = 0; program < 6; program++) {
      // Any byte, unknown opcodes and registers 4–7 included; END last so rows finish.
      const bytes = Array.from({ length: 16 }, (_, i) => (i === 15 ? 0 : Math.floor(next() * 256)));
      const node = datapathNode("shader8", "dut", 0, 0, bytes);
      expect(shaderBytes(node.module!)).toEqual(bytes);
      const lanesAsGates = { ...node, behaviour: undefined };
      const runners = [new Runner(node), new Runner(lanesAsGates), new Runner(allGates(node))];
      for (let tick = 0; tick < 60; tick++) {
        const run = next() < 0.85;
        for (const clock of [false, true]) {
          const [folded, ...others] = runners.map((r) => r.apply([run, clock]));
          for (const other of others)
            expect(other, `program ${program} tick ${tick}`).toEqual(folded);
        }
      }
    }
  });

  it("shaderLane: block equals gates on random control lines", () => {
    const node = datapathNode("shaderLane", "dut", 0, 0);
    const runners = [new Runner(node), new Runner(allGates(node))];
    const next = random(11);
    for (let i = 0; i < 400; i++) {
      const inputs = Array.from({ length: 8 + LANE_LINES.length }, () => next() < 0.3);
      for (const clock of [false, true]) {
        const [a, b] = runners.map((r) => r.apply([...inputs, clock]));
        expect(b, `step ${i}`).toEqual(a);
      }
    }
  });
});

describe("shader8 across fold and unfold", () => {
  it("unfolding seeds the gates and folding reads them back mid-frame", () => {
    const node = shaderNode(SAMPLE_SHADERS.SQUARE);
    const folded = new Runner(node);
    rowsWritten(folded, 3);
    for (let i = 0; i < 4; i++) {
      folded.apply([true, false]);
      folded.apply([true, true]);
    }
    const state = folded.state.blocks?.dut;
    const seeded = unfoldBlockState(node, state);
    expect(foldBlockState(node, seeded)).toEqual(state);
    // Run the gate form from the seeded state; it must keep agreeing with the block.
    const gates = new Runner({ ...node, behaviour: undefined });
    gates.state = { ...gates.state, modules: { dut: seeded } };
    const allLanes = new Runner(allGates(node));
    allLanes.state = {
      ...allLanes.state,
      modules: {
        dut: {
          ...seeded,
          blocks: {},
          modules: Object.fromEntries(
            Object.entries(seeded.blocks ?? {}).map(([id, lane]) => [
              id,
              unfoldBlockState(node.module!.nodes.find((n) => n.id === id)!, lane),
            ]),
          ),
        },
      },
    };
    for (let tick = 0; tick < 40; tick++)
      for (const clock of [false, true]) {
        const want = folded.apply([true, clock]);
        expect(gates.apply([true, clock]), `tick ${tick}`).toEqual(want);
        expect(allLanes.apply([true, clock]), `tick ${tick}`).toEqual(want);
      }
    expect(foldBlockState(node, gates.state.modules.dut)).toEqual(folded.state.blocks?.dut);
    expect(foldBlockState(node, allLanes.state.modules.dut)).toEqual(folded.state.blocks?.dut);
  });

  it("shaderLane: round trip", () => {
    const node = datapathNode("shaderLane", "dut", 0, 0);
    const lane = { a: 5, p: true, clock: true };
    expect(foldBlockState(node, unfoldBlockState(node, lane))).toEqual(lane);
  });
});

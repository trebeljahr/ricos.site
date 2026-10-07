import { describe, expect, it } from "vitest";
import {
  compileProgram,
  controlWord,
  decodeControlWord,
  encodeControlWord,
  ISA,
  MAX_T_STATES,
  microcodeAddress,
  microcodeRom,
  SAMPLE_PROGRAMS,
  SIGNALS,
  traceTicks,
} from "../computerStepper";
import { foldControlState, microcodeWords, T_BITS, unfoldControlState } from "./controlUnit";
import { datapathNode, foldBlockState, toBits, toNumber, unfoldBlockState } from "./datapathBlocks";
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

type Kind = "tstate" | "microcode" | "control";

/** Strips every behaviour, so the whole block (nested blocks too) runs as gates. */
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

/** Drives one form of a block through its input switches. */
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

/** The folded block and its full gate form, side by side; outputs must agree. */
class Pair {
  readonly runners: [Runner, Runner];
  constructor(kind: Kind) {
    const block = datapathNode(kind, "dut", 0, 0);
    expect(activeBlock(block)?.name).toBe(kind);
    this.runners = [new Runner(block), new Runner(allGates(block))];
  }
  apply(inputs: boolean[]): boolean[] {
    const [folded, gates] = this.runners.map((runner) => runner.apply(inputs));
    expect(folded).toEqual(gates);
    return folded;
  }
}

const opcodes = [...ISA.map((item) => item.opcode), 0x00, 0x11, 0xff];
/** The control word on a block's outputs; the control unit's GCLK comes after it. */
const word = (outputs: boolean[]) => toNumber(outputs.slice(0, SIGNALS.length));
const signalIndex = (name: string) => SIGNALS.indexOf(name as (typeof SIGNALS)[number]);

/** Seeded PRNG (mulberry32), so failures reproduce. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("control unit", () => {
  it("keeps each gate form inside the import limits and keeps the behaviour", () => {
    for (const kind of ["tstate", "microcode", "control"] as const) {
      const circuit = { name: kind, nodes: [datapathNode(kind, "dut", 0, 0)], wires: [] };
      const validated = validateCircuit(JSON.parse(JSON.stringify(circuit)));
      expect(validated?.nodes[0].behaviour, kind).toBe(kind);
      // The gates alone also fit, so the reader can run the block unfolded.
      const gates = { name: kind, nodes: [allGates(datapathNode(kind, "dut", 0, 0))], wires: [] };
      expect(validateCircuit(JSON.parse(JSON.stringify(gates))), kind).not.toBeNull();
    }
  });

  it("tstate: counts up on rising edges, wraps, and STEP_RESET returns it to T0", () => {
    const pair = new Pair("tstate");
    const next = random(7);
    let t = 0;
    for (let i = 0; i < 300; i++) {
      const reset = next() < 0.2;
      expect(toNumber(pair.apply([reset, false]))).toBe(t);
      t = reset ? 0 : (t + 1) % MAX_T_STATES;
      expect(toNumber(pair.apply([reset, true]))).toBe(t);
    }
    expect(toNumber(pair.apply([false, false]))).toBe(t);
  });

  it("microcode: the gates hold exactly the ROM generated from the table", () => {
    const block = datapathNode("microcode", "dut", 0, 0);
    expect(microcodeWords(block.module!)).toEqual(microcodeRom());
    expect(microcodeRom().length).toBe(256 * MAX_T_STATES * 2);
    expect(2 ** T_BITS).toBe(MAX_T_STATES);
  });

  it("microcode: block equals gates for every address", { timeout: 60_000 }, () => {
    const pair = new Pair("microcode");
    for (let opcode = 0; opcode < 256; opcode++)
      for (let t = 0; t < MAX_T_STATES; t++)
        for (const carry of [false, true]) {
          const word = pair.apply([...toBits(opcode, 8), ...toBits(t, T_BITS), carry]);
          expect(toNumber(word)).toBe(encodeControlWord(controlWord(opcode, t, carry)));
        }
  });

  it("microcode: the row view names its rows after the table", () => {
    const rom = datapathNode("microcode", "dut", 0, 0).module!;
    const labels = rom.nodes.map((node) => node.label ?? "");
    expect(labels).toContain("T0 ANY: PC_OUT CMAR_IN");
    expect(labels.some((label) => label.startsWith("T4 OTHER: HALT"))).toBe(true);
    expect(labels.some((label) => label.startsWith("T4 JNC C0:"))).toBe(true);
  });

  it("steps the control unit alone through every opcode, matching the table tick by tick", {
    timeout: 60_000,
  }, () => {
    for (const opcode of opcodes)
      for (const carry of [false, true]) {
        const pair = new Pair("control");
        let t = 0;
        let halted = false;
        for (let tick = 0; tick < 3 * MAX_T_STATES; tick++) {
          const inputs = [...toBits(opcode, 8), carry];
          const low = pair.apply([...inputs, false]);
          const expected = controlWord(opcode, t, carry);
          const label = `${opcode.toString(16)} carry=${carry} tick ${tick} T${t}`;
          expect(word(low), label).toBe(encodeControlWord(expected));
          expect(low[SIGNALS.length], `${label} GCLK low`).toBe(false);
          const high = pair.apply([...inputs, true]);
          if (expected.includes("HALT")) halted = true;
          else t = expected.includes("STEP_RESET") ? 0 : t + 1;
          expect(t, label).toBeLessThan(MAX_T_STATES);
          // After the edge the outputs show the next T-state's word. GCLK
          // follows CLK until that word holds HALT; then the clock stays off.
          const after = controlWord(opcode, t, carry);
          expect(word(high), label).toBe(encodeControlWord(after));
          expect(high[SIGNALS.length], `${label} GCLK`).toBe(!after.includes("HALT"));
        }
        expect(halted).toBe(controlWord(opcode, 4, carry).includes("HALT"));
      }
  });

  it("matches traceTicks' control word on every tick of every sample program", {
    timeout: 60_000,
  }, () => {
    for (const [name, source] of Object.entries(SAMPLE_PROGRAMS)) {
      const ticks = traceTicks(compileProgram(source));
      const runners = [
        new Runner(datapathNode("control", "dut", 0, 0)),
        new Runner(allGates(datapathNode("control", "dut", 0, 0))),
      ];
      let ir = 0;
      let carry = false;
      for (const tick of ticks) {
        // The circuit sees IR and the carry flag as they were before this tick.
        const inputs = [...toBits(ir, 8), carry];
        for (const runner of runners) {
          const outputs = runner.apply([...inputs, false]);
          runner.apply([...inputs, true]);
          expect(decodeControlWord(word(outputs)), `${name} tick ${tick.index}`).toEqual(
            decodeControlWord(encodeControlWord(tick.control)),
          );
        }
        ir = tick.registers.ir;
        carry = tick.registers.carry;
      }
      expect(ticks.at(-1)?.control, name).toContain("HALT");
    }
  });

  it("HALT stops the circuit: once halted, more clock ticks change nothing", () => {
    const pair = new Pair("control");
    const halt = [...toBits(0xf0, 8), false];
    for (let tick = 0; tick < 5; tick++) {
      pair.apply([...halt, false]);
      pair.apply([...halt, true]);
    }
    const before = pair.runners[0].state.blocks?.dut;
    for (let tick = 0; tick < 10; tick++) {
      const low = pair.apply([...halt, false]);
      const high = pair.apply([...halt, true]);
      expect(low[signalIndex("HALT")]).toBe(true);
      expect(high[SIGNALS.length]).toBe(false);
    }
    expect(pair.runners[0].state.blocks?.dut).toEqual(before);
  });

  it("carries the T-state across fold and unfold", () => {
    const node = datapathNode("control", "dut", 0, 0);
    const words = microcodeRom();
    for (let t = 0; t < MAX_T_STATES; t++)
      for (const clock of [false, true]) {
        const state = { t, clock, words };
        const inner = unfoldBlockState(node, state);
        expect(foldBlockState(node, inner)).toEqual(state);
        // With the nested counter unfolded too, its flip-flops hold T.
        const counter = datapathNode("tstate", "tstate", 0, 0);
        const cells = unfoldControlState("tstate", { t, clock });
        expect(foldControlState(counter, "tstate", cells)).toEqual({ t, clock });
        const nested = {
          ...inner,
          modules: { tstate: cells },
          blocks: { microcode: inner.blocks!.microcode },
        };
        expect(foldBlockState(node, nested)).toEqual(state);
      }
  });

  it("runs on from an unfolded counter exactly as the folded block would", () => {
    const opcode = 0x20; // LDM: six T-states.
    const folded = new Runner(datapathNode("control", "dut", 0, 0));
    const inputs = [...toBits(opcode, 8), false];
    for (let tick = 0; tick < 3; tick++) {
      folded.apply([...inputs, false]);
      folded.apply([...inputs, true]);
    }
    // Hand the folded state to the gate form, as unfolding in the builder does.
    const gates = new Runner(allGates(datapathNode("control", "dut", 0, 0)));
    const inner = unfoldBlockState(folded.block, folded.state.blocks!.dut);
    const counter = inner.blocks!.tstate as { t: number; clock: boolean };
    gates.state = {
      ...folded.state,
      blocks: {},
      modules: {
        dut: { ...inner, blocks: {}, modules: { tstate: unfoldControlState("tstate", counter) } },
      },
    };
    for (let tick = 0; tick < 2 * MAX_T_STATES; tick++)
      for (const clock of [false, true])
        expect(gates.apply([...inputs, clock]), `tick ${tick}`).toEqual(
          folded.apply([...inputs, clock]),
        );
  });

  it("uses one ROM address layout with the stepper", () => {
    expect(microcodeAddress(0xff, MAX_T_STATES - 1, true)).toBe(microcodeRom().length - 1);
  });
});

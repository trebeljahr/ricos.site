import { describe, expect, it } from "vitest";
import {
  blockAdder,
  flatAdder,
  moduleChain,
  norLatches,
  registerBlocks,
} from "./benchmark/syntheticCircuits";
import {
  BLUEPRINTS,
  type Circuit,
  initialSnapshot,
  moduleInputs,
  PRESETS,
  rippleFrame,
  type Snapshot,
  step,
  stepWithDelays,
} from "./logic";

const withSwitch = (circuit: Circuit, id: string, value: boolean): Circuit => ({
  ...circuit,
  nodes: circuit.nodes.map((node) => (node.id === id ? { ...node, value } : node)),
});

/** Runs both evaluation paths side by side and checks they agree after every tick. */
function compare(name: string, start: Circuit) {
  let circuit = start;
  let plain: Snapshot = initialSnapshot();
  let timed: Snapshot = initialSnapshot();
  let clock = false;
  const tick = (high: boolean, pulses: Record<string, boolean> = {}) => {
    plain = step(circuit, plain, high, pulses);
    const ripple = stepWithDelays(circuit, timed, high, pulses);
    expect(ripple.snapshot, name).toEqual(plain);
    expect(
      Object.values(ripple.delays).every((t) => t >= 0 && t <= ripple.steps),
      name,
    ).toBe(true);
    expect(rippleFrame(timed, ripple, ripple.steps), name).toBe(ripple.snapshot);
    timed = ripple.snapshot;
  };
  tick(clock);
  // A fixed pseudo-random walk over the switches, with clock and pulse edges.
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const switches = circuit.nodes.filter((node) => node.type === "switch");
  const pulses = circuit.nodes.filter((node) => node.type === "pulse");
  for (let round = 0; round < 24; round++) {
    const target = switches[Math.floor(random() * switches.length)];
    if (target && random() < 0.7) circuit = withSwitch(circuit, target.id, !target.value);
    const pulse = pulses[Math.floor(random() * pulses.length)];
    clock = random() < 0.5 ? !clock : clock;
    tick(clock, pulse && random() < 0.5 ? { [pulse.id]: true } : {});
    switches.splice(0, switches.length, ...circuit.nodes.filter((node) => node.type === "switch"));
  }
}

describe("ripple evaluation", () => {
  it("settles to the same values as step() on every preset", () => {
    for (const [name, circuit] of Object.entries(PRESETS)) compare(name, circuit);
  });
  it("settles to the same values as step() on every gate blueprint", () => {
    for (const [name, circuit] of Object.entries(BLUEPRINTS)) compare(name, circuit);
  });
  it("settles to the same values as step() on loops, folded modules and behavioural blocks", () => {
    for (const { circuit } of [
      flatAdder(8),
      norLatches(4),
      moduleChain("Full adder", 4),
      blockAdder(8),
      registerBlocks(2),
    ])
      compare(circuit.name, circuit);
  });
  it("times the full adder's carry one gate behind its sum", () => {
    let circuit = withSwitch(PRESETS["Full adder"], "cin", true);
    const before = step(circuit, initialSnapshot(), false);
    circuit = withSwitch(circuit, "a", true);
    const { delays, steps, snapshot } = stepWithDelays(circuit, before, false);
    expect(delays).toEqual({ a: 0, xor1: 1, xor2: 2, and2: 2, sum: 2, or: 3, carry: 3 });
    expect(steps).toBe(3);
    expect(snapshot.values.sum).toBe(false);
    expect(snapshot.values.carry).toBe(true);
    const frames = [0, 1, 2, 3].map((at) => rippleFrame(before, { delays, steps, snapshot }, at));
    expect(frames.map((frame) => frame.values.xor2)).toEqual([true, true, false, false]);
    expect(frames.map((frame) => frame.values.carry)).toEqual([false, false, false, true]);
    expect(frames.map((frame) => frame.values.xor1)).toEqual([false, true, true, true]);
  });
  it("times bus nets as ordinary nets and replays their earlier value", () => {
    const before = step(PRESETS["8-bit shared bus"], initialSnapshot(), false);
    const circuit = withSwitch(PRESETS["8-bit shared bus"], "enable-b", true);
    const ripple = stepWithDelays(circuit, before, false);
    expect(ripple.snapshot.buses?.bus).toBe("X");
    expect(ripple.delays).toMatchObject({ "enable-b": 0, "drive-b": 1, bus: 2, split: 3 });
    expect(rippleFrame(before, ripple, 1).buses?.bus).toBe(before.buses?.bus);
    expect(rippleFrame(before, ripple, 2).buses?.bus).toBe("X");
  });
  it("counts a folded block as one delay step", () => {
    const inner = PRESETS["Half adder"];
    const circuit: Circuit = {
      name: "Boxed",
      nodes: [
        { id: "x", type: "switch", x: 0, y: 0, value: true },
        { id: "y", type: "switch", x: 0, y: 0, value: true },
        { id: "box", type: "module", module: inner, x: 0, y: 0 },
        { id: "out", type: "not", x: 0, y: 0 },
      ],
      wires: [
        { id: "w1", from: "x", to: "box", input: 0 },
        { id: "w2", from: "y", to: "box", input: 1 },
        { id: "w3", from: "box", to: "out", input: 0, output: 1 },
      ],
    };
    expect(moduleInputs(inner)).toHaveLength(2);
    const off = { ...circuit, nodes: circuit.nodes.map((part) => ({ ...part, value: false })) };
    const { delays } = stepWithDelays(circuit, step(off, initialSnapshot(), false), false);
    expect(delays.box).toBe(1);
    expect(delays.out).toBe(2);
  });
  it("flags a ring oscillator as unstable with a bounded number of steps", () => {
    const circuit: Circuit = {
      name: "Ring",
      nodes: [
        { id: "n1", type: "not", x: 0, y: 0 },
        { id: "n2", type: "not", x: 0, y: 0 },
        { id: "n3", type: "not", x: 0, y: 0 },
      ],
      wires: [
        { id: "a", from: "n1", to: "n2", input: 0 },
        { id: "b", from: "n2", to: "n3", input: 0 },
        { id: "c", from: "n3", to: "n1", input: 0 },
      ],
    };
    const ripple = stepWithDelays(circuit, initialSnapshot(), false);
    expect(ripple.snapshot.unstable).toBe(true);
    expect(ripple.snapshot).toEqual(step(circuit, initialSnapshot(), false));
    expect(ripple.steps).toBeLessThan(100);
  });
});

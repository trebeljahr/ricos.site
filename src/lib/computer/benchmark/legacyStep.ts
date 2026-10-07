// The engine's step() as it was before the precomputed wire index, topological
// settle and module caching (main at 36d0feed). Kept only so the benchmark can
// measure the speed-up and check that both engines agree. Do not use in the app.
import {
  type Circuit,
  initialSnapshot,
  inputCount,
  moduleInputs,
  moduleOutputs,
  type Node,
  outputCount,
  type Snapshot,
} from "../logic";

export function legacyStep(
  circuit: Circuit,
  previous: Snapshot,
  clockHigh: boolean,
  pulses: Record<string, boolean> = {},
  overrides: Record<string, boolean> = {},
  depth = 0,
): Snapshot {
  const nodes = new Map(circuit.nodes.map((node) => [node.id, node]));
  const wires = circuit.wires.filter(
    (wire) =>
      nodes.has(wire.from) &&
      nodes.has(wire.to) &&
      wire.input < inputCount(nodes.get(wire.to)!) &&
      (wire.output ?? 0) < outputCount(nodes.get(wire.from)!),
  );
  const values: Record<string, boolean> = { ...previous.values };
  const outputs: Record<string, boolean[]> = { ...previous.outputs };
  const modules: Record<string, Snapshot> = { ...previous.modules };
  for (const node of circuit.nodes) {
    if (node.type === "switch") values[node.id] = overrides[node.id] ?? Boolean(node.value);
    if (node.type === "clock") values[node.id] = overrides[node.id] ?? clockHigh;
    if (node.type === "pulse") values[node.id] = overrides[node.id] ?? Boolean(pulses[node.id]);
    if (node.type === "high") values[node.id] = true;
    if (node.type === "ground") values[node.id] = false;
    if (node.type === "input4" || node.type === "input8") {
      const bits = node.type === "input4" ? 4 : 8;
      outputs[node.id] = Array.from({ length: bits }, (_, bit) =>
        Boolean(((node.numberValue ?? 0) >> bit) & 1),
      );
    }
    if (["dff", "srlatch", "dlatch", "dramcell"].includes(node.type))
      values[node.id] = Boolean(previous.memory[node.id]);
  }
  let unstable = false;
  const inputs = (node: Node) =>
    Array.from({ length: inputCount(node) }, (_, port) => {
      const wire = wires.find((candidate) => candidate.to === node.id && candidate.input === port);
      return wire ? Boolean(outputs[wire.from]?.[wire.output ?? 0] ?? values[wire.from]) : false;
    });
  // Combinational gates settle within one tick. A feedback loop that does not settle is flagged.
  const settle = () => {
    for (let pass = 0; pass <= circuit.nodes.length; pass++) {
      let changed = false;
      for (const node of circuit.nodes) {
        const signals = inputs(node);
        const [a, b] = signals;
        let next: boolean;
        switch (node.type) {
          case "module": {
            if (depth >= 6 || !node.module) continue;
            const innerInputs = moduleInputs(node.module);
            const inner = legacyStep(
              node.module,
              previous.modules[node.id] ?? initialSnapshot(),
              clockHigh,
              {},
              Object.fromEntries(innerInputs.map((port, index) => [port.id, signals[index]])),
              depth + 1,
            );
            modules[node.id] = inner;
            const bits = moduleOutputs(node.module).map((port) => Boolean(inner.values[port.id]));
            if (bits.some((bit, index) => bit !== outputs[node.id]?.[index])) changed = true;
            outputs[node.id] = bits;
            next = bits[0] ?? false;
            if (inner.unstable) unstable = true;
            break;
          }
          case "lamp":
            next = a;
            break;
          case "display4":
          case "display8":
            outputs[node.id] = signals;
            next = signals.some(Boolean);
            break;
          case "nmos":
            next = a && b;
            break;
          case "pmos":
            next = !a && b;
            break;
          case "junction":
            next = a || b;
            break;
          case "not":
            next = !a;
            break;
          case "and":
            next = a && b;
            break;
          case "or":
            next = a || b;
            break;
          case "xor":
            next = a !== b;
            break;
          case "xnor":
            next = a === b;
            break;
          case "nand":
            next = !(a && b);
            break;
          case "nor":
            next = !(a || b);
            break;
          default:
            continue;
        }
        if (values[node.id] !== next) {
          values[node.id] = next;
          changed = true;
        }
      }
      if (!changed) break;
      if (pass === circuit.nodes.length) unstable = true;
    }
  };
  settle();
  const memory = { ...previous.memory };
  const age = { ...previous.age };
  const lastClock = { ...previous.lastClock };
  for (const node of circuit.nodes) {
    if (node.type !== "dff" && node.type !== "dramcell") continue;
    const [data, clock] = inputs(node);
    if (clock && !previous.lastClock[node.id]) {
      memory[node.id] = data;
      if (node.type === "dramcell") age[node.id] = 0;
    } else if (node.type === "dramcell" && clockHigh && !previous.lastClock.__dramTick) {
      age[node.id] = (previous.age?.[node.id] ?? 0) + 1;
      if (age[node.id] >= 4) memory[node.id] = false;
    }
    lastClock[node.id] = clock;
  }
  for (const node of circuit.nodes) {
    if (node.type !== "srlatch") continue;
    const [set, reset] = inputs(node);
    if (set && reset) unstable = true;
    else if (set) memory[node.id] = true;
    else if (reset) memory[node.id] = false;
  }
  for (const node of circuit.nodes) {
    if (node.type !== "dlatch") continue;
    const [data, enable] = inputs(node);
    if (enable) memory[node.id] = data;
  }
  lastClock.__dramTick = clockHigh;
  for (const node of circuit.nodes)
    if (["dff", "srlatch", "dlatch", "dramcell"].includes(node.type))
      values[node.id] = Boolean(memory[node.id]);
  settle();
  return { values, memory, age, lastClock, outputs, modules, unstable };
}

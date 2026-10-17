import {
  type Circuit,
  type CircuitPorts,
  type GateType,
  inputCount,
  moduleInputs,
  moduleOutputs,
} from "./logic";

export type SymbolIdentity =
  | GateType
  | "mux"
  | "demux"
  | "decoder"
  | "encoder"
  | "adder"
  | "register"
  | "counter"
  | "memory"
  | "alu"
  | "comparator";
export type RecognitionComponent = {
  id: string;
  label: string;
  inputs: readonly string[];
  outputs: readonly string[];
  symbol: SymbolIdentity;
  /** Direction marking for a registered counter schematic. */
  counterMode?: "up" | "down" | "up-down";
  /** A total combinational function, in the declared order. Never a sampled table. */
  evaluate?: (inputs: boolean[]) => boolean[];
};
const registry = new Map<string, RecognitionComponent>();
let revision = 0;
export function registerRecognitionComponent(component: RecognitionComponent) {
  registry.set(component.id, component);
  revision++;
}
export const recognitionComponents = () => [...registry.values()];
export const recognitionComponent = (id: string) => registry.get(id);
const gates = {
  not: ([a]: boolean[]) => [!a],
  and: ([a, b]: boolean[]) => [a && b],
  nand: ([a, b]: boolean[]) => [!(a && b)],
  or: ([a, b]: boolean[]) => [a || b],
  nor: ([a, b]: boolean[]) => [!(a || b)],
  xor: ([a, b]: boolean[]) => [a !== b],
  xnor: ([a, b]: boolean[]) => [a === b],
};
for (const [id, evaluate] of Object.entries(gates))
  registerRecognitionComponent({
    id,
    label: id.toUpperCase(),
    inputs: id === "not" ? ["A"] : ["A", "B"],
    outputs: ["OUT"],
    symbol: id as GateType,
    evaluate,
  });
registerRecognitionComponent({
  id: "selector",
  label: "Selector (2:1 mux)",
  inputs: ["SELECT", "A", "B"],
  outputs: ["OUT"],
  symbol: "mux",
  evaluate: ([s, a, b]) => [s ? b : a],
});
registerRecognitionComponent({
  id: "switch",
  label: "Switch (1:2 demux)",
  inputs: ["SELECT", "DATA"],
  outputs: ["TO A", "TO B"],
  symbol: "demux",
  evaluate: ([s, d]) => [!s && d, s && d],
});
registerRecognitionComponent({
  id: "decoder",
  label: "2:4 decoder",
  inputs: ["A0", "A1"],
  outputs: ["Y0", "Y1", "Y2", "Y3"],
  symbol: "decoder",
  evaluate: ([a, b]) => [0, 1, 2, 3].map((n) => n === Number(a) + 2 * Number(b)),
});
registerRecognitionComponent({
  id: "priority-encoder4",
  label: "4:2 priority encoder (highest input wins)",
  inputs: ["D0", "D1", "D2", "D3"],
  outputs: ["A0", "A1"],
  symbol: "encoder",
  evaluate: ([, b, c, d]) => [d || (!c && b), c || d],
});
registerRecognitionComponent({
  id: "half-adder",
  label: "Half adder",
  inputs: ["A", "B"],
  outputs: ["SUM", "CARRY"],
  symbol: "adder",
  evaluate: ([a, b]) => [a !== b, a && b],
});
registerRecognitionComponent({
  id: "full-adder",
  label: "Full adder",
  inputs: ["A", "B", "CARRY IN"],
  outputs: ["SUM", "CARRY"],
  symbol: "adder",
  evaluate: ([a, b, c]) => [(a !== b) !== c, Number(a) + Number(b) + Number(c) >= 2],
});

export const RECOGNITION_LIMITS = { inputs: 8, nodes: 512, evaluations: 65536 } as const;
export type PortMapping = { nodeId: string; role: string };
export type RecognitionMatch = {
  componentId: string;
  label: string;
  inputs: PortMapping[];
  outputs: PortMapping[];
};
export type Counterexample = {
  componentId: string;
  inputs: boolean[];
  expected: boolean[];
  actual: boolean[];
};
export type RecognitionResult = {
  status: "equivalent" | "mismatch" | "unsupported" | "invalid";
  message: string;
  rows: number;
  matches: RecognitionMatch[];
  counterexamples: Counterexample[];
};
const failure = (status: RecognitionResult["status"], message: string): RecognitionResult => ({
  status,
  message,
  rows: 0,
  matches: [],
  counterexamples: [],
});

/** ID-, label-, layout-, and switch-position-independent, but sensitive to implementation edits. */
export function circuitImplementation(circuit: Circuit): string {
  const visit = (source: Circuit, depth: number): unknown => {
    if (depth > 6) return "depth-limit";
    const indices = new Map(source.nodes.map((node, i) => [node.id, i]));
    const ports = source.ports ?? {
      inputs: moduleInputs(source).map((n) => n.id),
      outputs: moduleOutputs(source).map((n) => n.id),
    };
    return [
      source.nodes.map((n) => [
        n.type,
        n.splice ?? false,
        n.resettable ?? false,
        n.numberValue ?? 0,
        n.behaviour ?? "",
        n.module ? visit(n.module, depth + 1) : null,
      ]),
      source.wires
        .map((w) => [indices.get(w.from), w.output ?? 0, indices.get(w.to), w.input])
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      ports.inputs.map((id) => indices.get(id) ?? -1),
      ports.outputs.map((id) => indices.get(id) ?? -1),
    ];
  };
  return JSON.stringify(visit(circuit, 0));
}
export function circuitFingerprint(circuit: Circuit) {
  const text = circuitImplementation(circuit);
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ text.charCodeAt(i);
  }
  return `${(a >>> 0).toString(16)}-${(b >>> 0).toString(16)}`;
}

class RecognitionError extends Error {
  constructor(
    readonly status: "unsupported" | "invalid",
    message: string,
  ) {
    super(message);
  }
}
function sizeOf(circuit: Circuit, depth = 0): number {
  if (depth > 5) return Infinity;
  return circuit.nodes.reduce(
    (n, node) => n + 1 + (node.module ? sizeOf(node.module, depth + 1) : 0),
    0,
  );
}
function prepare(circuit: Circuit, ports: CircuitPorts) {
  if (!ports.outputs.length)
    throw new RecognitionError(
      "invalid",
      "Mark at least one public lamp output. Internal probe lamps are not selected automatically.",
    );
  if (
    ports.inputs.length > RECOGNITION_LIMITS.inputs ||
    sizeOf(circuit) * 2 ** ports.inputs.length > RECOGNITION_LIMITS.evaluations ||
    sizeOf(circuit) > RECOGNITION_LIMITS.nodes
  )
    throw new RecognitionError(
      "unsupported",
      "Exhaustive check limit: 8 inputs, 512 nested nodes, and 65,536 node evaluations. Check a smaller construction.",
    );
  for (const [kind, ids] of Object.entries(ports)) {
    if (
      new Set(ids).size !== ids.length ||
      ids.some(
        (id: string) =>
          !circuit.nodes.some(
            (node) =>
              node.id === id &&
              (kind === "inputs"
                ? ["switch", "clock", "pulse"].includes(node.type)
                : node.type === "lamp"),
          ),
      )
    )
      throw new RecognitionError(
        "invalid",
        "Ports must be distinct input switches/clocks/pulses and output lamps in this construction.",
      );
  }
  if (
    circuit.nodes.some(
      (n) => ["switch", "clock", "pulse"].includes(n.type) && !ports.inputs.includes(n.id),
    )
  )
    throw new RecognitionError(
      "invalid",
      "Mark every input switch, clock, and pulse. Tie constant signals to HIGH or GROUND.",
    );
  // Compile connections once; no simulation shortcuts from behaviour or identity claims.
  const compile = (source: Circuit, depth: number): ((inputs: boolean[]) => boolean[]) => {
    if (depth > 5) throw new RecognitionError("unsupported", "Nested circuit depth limit reached.");
    const nodes = new Map(source.nodes.map((n) => [n.id, n]));
    const incoming = new Map<string, Map<number, { from: string; output: number }[]>>();
    for (const w of source.wires) {
      let bank = incoming.get(w.to);
      if (!bank) {
        bank = new Map();
        incoming.set(w.to, bank);
      }
      const list = bank.get(w.input) ?? [];
      list.push({ from: w.from, output: w.output ?? 0 });
      bank.set(w.input, list);
    }
    const children = new Map(
      source.nodes.filter((n) => n.module).map((n) => [n.id, compile(n.module!, depth + 1)]),
    );
    const ins = depth === 0 ? ports.inputs : moduleInputs(source).map((n) => n.id);
    const outs = depth === 0 ? ports.outputs : moduleOutputs(source).map((n) => n.id);
    return (inputs) => {
      const values = new Map<string, boolean[]>(ins.map((id, i) => [id, [inputs[i]]]));
      const active = new Set<string>();
      const read = (id: string): boolean[] => {
        const cached = values.get(id);
        if (cached) return cached;
        const node = nodes.get(id);
        if (!node) throw new RecognitionError("invalid", "A wire references a missing part.");
        if (active.has(id))
          throw new RecognitionError(
            "unsupported",
            "Feedback or nonsettling path found. Stateful recognition needs a reset and temporal specification; no snapshot proof is made.",
          );
        active.add(id);
        const signal = (pin: number): boolean => {
          const drivers = incoming.get(id)?.get(pin) ?? [];
          if (!drivers.length)
            throw new RecognitionError(
              "invalid",
              `Undriven input ${pin + 1} on ${node.label || node.type}. Floating signals cannot verify a component.`,
            );
          if (drivers.length !== 1)
            throw new RecognitionError(
              "invalid",
              `Multiple drivers on ${node.label || node.type}. Conflicting or ambiguous signals cannot verify a component.`,
            );
          const d = drivers[0],
            value = read(d.from)[d.output];
          if (typeof value !== "boolean")
            throw new RecognitionError("invalid", "Unknown output signal or invalid pin mapping.");
          return value;
        };
        let result: boolean[];
        if (node.type in gates)
          result = gates[node.type as keyof typeof gates](
            Array.from({ length: inputCount(node) }, (_, i) => signal(i)),
          );
        else if (node.type === "high" || node.type === "ground") result = [node.type === "high"];
        else if (node.type === "lamp") result = [signal(0)];
        else if (node.type === "junction" && node.splice) {
          const pins = [...(incoming.get(id)?.keys() ?? [])];
          if (pins.length !== 1)
            throw new RecognitionError("invalid", "A one-bit splice must have exactly one driver.");
          result = [signal(pins[0])];
        } else if (node.type === "junction") {
          const a = signal(0),
            b = signal(1);
          result = [a || b];
        } else if (node.type === "nmos" || node.type === "pmos") {
          const a = signal(0),
            b = signal(1);
          result = [(node.type === "nmos" ? a : !a) && b];
        } else if (node.type === "module" && node.behaviour)
          throw new RecognitionError(
            "unsupported",
            "Folded behavioral blocks require their own reset/temporal contract. Open a gate-only construction for exhaustive recognition.",
          );
        else if (node.type === "module" && node.module)
          result = children.get(id)!(Array.from({ length: inputCount(node) }, (_, i) => signal(i)));
        else
          throw new RecognitionError(
            "unsupported",
            ["dff", "srlatch", "dlatch", "dramcell"].includes(node.type)
              ? "Stateful part found. Recognition requires a reset and temporal specification; combinational equivalence is unsupported."
              : `${node.type} is unsupported by the binary checker. Bus Z/X, floating, and unknown signals are never treated as success.`,
          );
        active.delete(id);
        values.set(id, result);
        return result;
      };
      return outs.map((id) => read(id)[0]);
    };
  };
  return compile(circuit, 0);
}
function* evaluateRecognition(
  circuit: Circuit,
  ports: CircuitPorts,
  targetId?: string,
): Generator<void, RecognitionResult> {
  try {
    const evaluate = prepare(circuit, ports);
    const candidates = recognitionComponents().filter(
      (c) =>
        (!targetId || c.id === targetId) &&
        c.inputs.length === ports.inputs.length &&
        c.outputs.length === ports.outputs.length &&
        c.evaluate,
    );
    if (!candidates.length)
      return failure(
        "unsupported",
        "No eligible registered component has this port count. Stateful parts and large tables need a temporal or smaller specification.",
      );
    const failures = new Map<string, Counterexample>();
    const rows = 2 ** ports.inputs.length;
    for (let row = 0; row < rows; row++) {
      const inputs = ports.inputs.map((_, bit) => Boolean(row & (2 ** bit)));
      const actual = evaluate(inputs);
      for (const component of candidates) {
        if (failures.has(component.id)) continue;
        const expected = component.evaluate!(inputs);
        if (expected.length !== actual.length || expected.some((v, i) => v !== actual[i]))
          failures.set(component.id, { componentId: component.id, inputs, expected, actual });
      }
      if (row % 8 === 7) yield;
    }
    const matches = candidates
      .filter((c) => !failures.has(c.id))
      .map((c) => ({
        componentId: c.id,
        label: c.label,
        inputs: ports.inputs.map((nodeId, i) => ({ nodeId, role: c.inputs[i] })),
        outputs: ports.outputs.map((nodeId, i) => ({ nodeId, role: c.outputs[i] })),
      }));
    return {
      status: matches.length ? "equivalent" : "mismatch",
      rows,
      matches,
      counterexamples: [...failures.values()],
      message: matches.length
        ? `Equivalent on all ${rows} input combinations in this port order. Actual internals retained.`
        : `No match on all ${rows} input combinations. Recheck wiring and port order; counterexamples shown below.`,
    };
  } catch (error) {
    return failure(
      error instanceof RecognitionError ? error.status : "invalid",
      error instanceof Error ? error.message : "Unable to evaluate circuit.",
    );
  }
}
export function recognizeCircuitSync(
  circuit: Circuit,
  ports: CircuitPorts,
  targetId?: string,
): RecognitionResult {
  const run = evaluateRecognition(circuit, ports, targetId);
  let next = run.next();
  while (!next.done) next = run.next();
  return next.value;
}
export async function recognizeCircuit(
  circuit: Circuit,
  ports: CircuitPorts,
  options: { targetId?: string; signal?: AbortSignal } = {},
) {
  if (options.signal?.aborted) throw new DOMException("Recognition cancelled", "AbortError");
  const run = evaluateRecognition(circuit, ports, options.targetId);
  let next = run.next();
  while (!next.done) {
    if (options.signal?.aborted) throw new DOMException("Recognition cancelled", "AbortError");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    next = run.next();
  }
  return next.value;
}
const builtins = new Map<string, Set<string>>();
/** Called only at the source catalog boundary; imports must match a registered implementation. */
export function builtinCircuit(
  componentId: string,
  circuit: Circuit,
  symbol: SymbolIdentity = "module",
): Circuit {
  if ((registry.get(componentId)?.symbol ?? symbol) === "module") return circuit;
  if (!registry.has(componentId))
    registerRecognitionComponent({
      id: componentId,
      label: circuit.name,
      inputs: moduleInputs(circuit).map((n) => n.label || n.id),
      outputs: moduleOutputs(circuit).map((n) => n.label || n.id),
      symbol,
    });
  const key = circuitImplementation(circuit),
    known = builtins.get(componentId) ?? new Set();
  known.add(key);
  builtins.set(componentId, known);
  return {
    ...circuit,
    identity: { componentId, fingerprint: circuitFingerprint(circuit), ownership: "builtin" },
  };
}
/** Reorder a boxed interface without silently changing its parent connections. */
export function remapModulePins(
  parent: Circuit,
  moduleId: string,
  inner: Circuit,
): Circuit["wires"] {
  const before = parent.nodes.find((node) => node.id === moduleId)?.module;
  if (!before) return parent.wires;
  const oldIn = moduleInputs(before),
    oldOut = moduleOutputs(before);
  const nextIn = moduleInputs(inner),
    nextOut = moduleOutputs(inner);
  return parent.wires.flatMap((wire) => {
    const input =
      wire.to === moduleId ? nextIn.findIndex((n) => n.id === oldIn[wire.input]?.id) : wire.input;
    const output =
      wire.from === moduleId
        ? nextOut.findIndex((n) => n.id === oldOut[wire.output ?? 0]?.id)
        : wire.output;
    return input < 0 || (output !== undefined && output < 0) ? [] : [{ ...wire, input, output }];
  });
}
export function verifyCircuitIdentity(
  circuit: Circuit,
  ports: CircuitPorts,
  componentId: string,
): Circuit | null {
  const next = { ...circuit, ports: { inputs: [...ports.inputs], outputs: [...ports.outputs] } };
  const result = recognizeCircuitSync(next, ports, componentId);
  return result.matches.some((m) => m.componentId === componentId)
    ? {
        ...next,
        identity: { componentId, fingerprint: circuitFingerprint(next), ownership: "user" },
      }
    : null;
}
const identityCache = new Map<string, boolean>();
/** Imported assertions and cached results both require the exact current implementation. */
export function verifiedCircuitIdentity(
  circuit?: Circuit,
): { component: RecognitionComponent; yours: boolean } | null {
  const claim = circuit?.identity;
  if (!circuit || !claim || claim.fingerprint !== circuitFingerprint(circuit)) return null;
  const component = registry.get(claim.componentId);
  if (!component) return null;
  const implementation = circuitImplementation(circuit);
  if (claim.ownership === "builtin")
    return builtins.get(component.id)?.has(implementation) ? { component, yours: false } : null;
  const key = `${revision}|${component.id}|${implementation}`;
  let valid = identityCache.get(key);
  if (valid === undefined) {
    valid = Boolean(
      circuit.ports && recognizeCircuitSync(circuit, circuit.ports, component.id).matches.length,
    );
    if (identityCache.size > 128) identityCache.clear();
    identityCache.set(key, valid);
  }
  return valid ? { component, yours: true } : null;
}

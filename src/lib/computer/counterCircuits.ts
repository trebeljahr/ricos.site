import { type Circuit, type Node, type Wire, moduleInputs, moduleOutputs } from "./logic";
import { builtinCircuit, registerRecognitionComponent } from "./recognition";

export const COUNTER_WIDTHS = [2, 3, 4, 5, 6, 7, 8] as const;
export type CounterWidth = (typeof COUNTER_WIDTHS)[number];
export const COUNTER_MODES = ["up", "down", "up-down"] as const;
export type CounterMode = (typeof COUNTER_MODES)[number];
export const counterTitle = (width: CounterWidth, mode: CounterMode) =>
  `${width}-bit ${mode === "up-down" ? "up/down" : mode} counter`;
export const counterPart = (width: CounterWidth, mode: CounterMode) =>
  `manual-counter-${width}-${mode}`;
export const COUNTER_CONTRACT =
  "Starts at 0. Rising COUNT edges change the unsigned value modulo 2^width; holding does not repeat. RESET clears immediately and wins over counting. Up/down: both inputs high holds; release both to rearm the shared clock. Saved circuits reopen at 0; folding preserves the live count.";

/** Exactly width state bits. No hidden byte counter or behavioral simulation shortcut. */
export function counterCircuit(width: CounterWidth, mode: CounterMode): Circuit {
  if (!COUNTER_WIDTHS.includes(width) || !COUNTER_MODES.includes(mode))
    throw new Error("Invalid counter configuration");
  const nodes: Node[] = [];
  const wires: Wire[] = [];
  const add = (id: string, type: Node["type"], x: number, y: number, label = id): string => {
    nodes.push({ id, type, x, y, label });
    return id;
  };
  const wire = (from: string, to: string, input = 0): void => {
    wires.push({ id: `${from}>${to}:${input}`, from, to, input });
  };
  const gate = (id: string, type: Node["type"], sources: string[], x: number, y: number) => {
    add(id, type, x, y, type.toUpperCase());
    sources.forEach((from, input) => {
      wire(from, id, input);
    });
    return id;
  };
  if (mode !== "down") add("inc", "switch", 30, 30, "INCREMENT");
  if (mode !== "up") add("dec", "switch", 30, 190, "DECREMENT");
  add("reset", "switch", 30, 350, "RESET");
  const clock =
    mode === "up-down"
      ? gate("count-clock", "or", ["inc", "dec"], 220, 30)
      : mode === "up"
        ? "inc"
        : "dec";
  const enabled = mode === "up-down" ? gate("count-enable", "xor", ["inc", "dec"], 220, 190) : null;
  let ones = "inc",
    zeros = "dec";
  for (let bit = 0; bit < width; bit++) {
    const x = 440 + bit * 490;
    const cell = add(`cell${bit}`, "dff", x + 280, 200, `Q${bit} MEMORY`);
    nodes[nodes.length - 1].resettable = true;
    let toggle =
      mode === "up"
        ? ones
        : mode === "down"
          ? zeros
          : gate(`either${bit}`, "or", [ones, zeros], x, 30);
    if (enabled) toggle = gate(`toggle${bit}`, "and", [toggle, enabled], x, 190);
    const data = gate(`next${bit}`, "xor", [cell, toggle], x + 140, 370);
    wire(data, cell, 0);
    wire(clock, cell, 1);
    wire("reset", cell, 2);
    add(`q${bit}`, "lamp", x + 280, 30, `Q${bit}`);
    wire(cell, `q${bit}`);
    if (bit < width - 1) {
      if (mode !== "down") ones = gate(`carry${bit}`, "and", [ones, cell], x + 280, 550);
      if (mode !== "up") {
        const inverted = gate(`not${bit}`, "not", [cell], x + 140, 720);
        zeros = gate(`borrow${bit}`, "and", [zeros, inverted], x + 280, 720);
      }
    }
  }
  const circuit: Circuit = { name: counterTitle(width, mode), nodes, wires };
  circuit.ports = {
    inputs: moduleInputs(circuit).map((n) => n.id),
    outputs: moduleOutputs(circuit).map((n) => n.id),
  };
  return circuit;
}

// Register all built-in identities at the source boundary. These are implementations,
// not claims of temporal equivalence for arbitrary user circuits.
const counters = new Map<string, Circuit>();
for (const width of COUNTER_WIDTHS)
  for (const mode of COUNTER_MODES) {
    const id = counterPart(width, mode);
    const source = counterCircuit(width, mode);
    registerRecognitionComponent({
      id,
      label: source.name,
      inputs: moduleInputs(source).map((n) => n.label!),
      outputs: moduleOutputs(source).map((n) => n.label!),
      symbol: "counter",
      counterMode: mode,
    });
    counters.set(id, builtinCircuit(id, source, "counter"));
  }
export const counterComponent = (width: CounterWidth, mode: CounterMode) =>
  counters.get(counterPart(width, mode))!;

/** Buttons and numeric/bit readouts already wired, with only width output pins. */
export function counterDemo(width: CounterWidth, mode: CounterMode): Circuit {
  const source = counterComponent(width, mode);
  const inputs = moduleInputs(source);
  const nodes: Node[] = inputs.map((port, i) => ({
    id: port.id,
    type: "pulse",
    x: 40,
    y: 40 + i * 180,
    label: port.label,
  }));
  nodes.push({
    id: "counter",
    type: "module",
    module: source,
    x: 270,
    y: 40,
    label: counterTitle(width, mode),
  });
  nodes.push({
    id: "value",
    type: width <= 4 ? "display4" : "display8",
    x: 680,
    y: 40,
    label: "COUNT",
  });
  const wires: Wire[] = inputs.map((port, input) => ({
    id: `${port.id}>counter`,
    from: port.id,
    to: "counter",
    input,
  }));
  for (let bit = 0; bit < width; bit++) {
    nodes.push({
      id: `q${bit}`,
      type: "lamp",
      x: 270 + (bit % 4) * 180,
      y: 430 + Math.floor(bit / 4) * 160,
      label: `Q${bit}`,
    });
    wires.push({ id: `counter>q${bit}`, from: "counter", output: bit, to: `q${bit}`, input: 0 });
    wires.push({
      id: `counter>value${bit}`,
      from: "counter",
      output: bit,
      to: "value",
      input: bit,
    });
  }
  return { name: `${source.name} demonstration`, nodes, wires };
}

/**
 * A computer as nesting dolls, the way it really nests. A doll can hold several
 * dolls, one doll can sit inside several others, and some layers reach straight
 * across the ones between them. Those reaches are the red threads.
 */

export type AbstractionLayer = {
  id: string;
  /** In full, for screen readers. */
  name: string;
  /** On the shelf under the doll. */
  tag: string;
  /** One plain sentence, for screen readers. */
  does: string;
  /** The colour of the doll. */
  color: string;
  /** The dolls inside this one. */
  inside: readonly string[];
  /** Which shelf it stands on, from the top, and where along it. */
  shelf: number;
  x: number;
};

export type Reach = {
  from: string;
  to: string;
  /** What the thread is. */
  label: string;
};

export const ABSTRACTION_LAYERS: readonly AbstractionLayer[] = [
  {
    id: "app",
    name: "The app you are using",
    tag: "APP",
    does: "It shows you this page and reacts when you scroll, click or type.",
    color: "#b5543d",
    inside: ["programming-languages"],
    shelf: 0,
    x: 120,
  },
  {
    id: "operating-system",
    name: "Operating system",
    tag: "OS",
    does: "It shares the processor, the memory and the devices among all running programs.",
    color: "#4b7d8c",
    inside: ["programming-languages"],
    shelf: 0,
    x: 260,
  },
  {
    id: "programming-languages",
    name: "Programming languages",
    tag: "CODE",
    does: "A programming language lets people describe a program with named values, expressions and instructions.",
    color: "#cf9a3e",
    inside: ["compiler-assembler"],
    shelf: 1,
    x: 150,
  },
  {
    id: "compiler-assembler",
    name: "Compiler and assembler",
    tag: "COMPILER",
    does: "Compilers and assemblers translate readable source into instructions that a processor can execute.",
    color: "#a17c54",
    inside: ["machine-code"],
    shelf: 1,
    x: 250,
  },
  {
    id: "machine-code",
    name: "Machine code",
    tag: "MACHINE CODE",
    does: "Machine code encodes instructions as bits that a particular processor knows how to read.",
    color: "#5f6f9e",
    inside: ["cpu", "ram", "input-output"],
    shelf: 2,
    x: 190,
  },
  {
    id: "cpu",
    name: "CPU",
    tag: "CPU",
    does: "The CPU fetches instructions from memory, decodes them and performs their operations.",
    color: "#8e5b80",
    inside: ["control-unit-clock", "buses", "alu", "registers"],
    shelf: 3,
    x: 90,
  },
  {
    id: "ram",
    name: "RAM",
    tag: "RAM",
    does: "RAM stores instructions and data at numbered addresses while a program runs.",
    color: "#9b785d",
    inside: ["multiplexers-decoders", "memory-cells"],
    shelf: 3,
    x: 190,
  },
  {
    id: "input-output",
    name: "Input and output",
    tag: "IN / OUT",
    does: "Device controllers move data between the computer and its keyboard, screen, storage and other devices.",
    color: "#c37b69",
    inside: ["registers"],
    shelf: 3,
    x: 290,
  },
  {
    id: "control-unit-clock",
    name: "Control unit and clock",
    tag: "CONTROL + CLOCK",
    does: "The control unit selects each step, while the clock sets the moments when stored values can change.",
    color: "#a86453",
    inside: ["logic-gates"],
    shelf: 4,
    x: 52,
  },
  {
    id: "buses",
    name: "Buses",
    tag: "BUSES",
    does: "Buses carry values between the CPU, memory and devices over shared groups of wires.",
    color: "#537e89",
    inside: ["multiplexers-decoders"],
    shelf: 4,
    x: 140,
  },
  {
    id: "alu",
    name: "Arithmetic and logic unit",
    tag: "ALU",
    does: "The arithmetic and logic unit adds, subtracts, compares and applies logic to binary numbers.",
    color: "#6e9548",
    inside: ["adders", "logic-gates"],
    shelf: 4,
    x: 228,
  },
  {
    id: "registers",
    name: "Registers",
    tag: "REGISTERS",
    does: "Registers hold one word at a time, including operands, results and the address of the next instruction.",
    color: "#94799c",
    inside: ["memory-cells", "multiplexers-decoders"],
    shelf: 4,
    x: 316,
  },
  {
    id: "multiplexers-decoders",
    name: "Multiplexers and decoders",
    tag: "SELECTORS",
    does: "A multiplexer selects one input, while a decoder activates the output named by a binary code.",
    color: "#477d74",
    inside: ["logic-gates"],
    shelf: 5,
    x: 100,
  },
  {
    id: "adders",
    name: "Adders",
    tag: "ADDERS",
    does: "An adder combines two binary numbers by calculating each sum bit and passing carries to the next position.",
    color: "#c56b40",
    inside: ["logic-gates"],
    shelf: 5,
    x: 190,
  },
  {
    id: "memory-cells",
    name: "Memory cells",
    tag: "LATCHES",
    does: "Latches and flip-flops store one bit by feeding signals back through a circuit.",
    color: "#b58d42",
    inside: ["logic-gates"],
    shelf: 5,
    x: 280,
  },
  {
    id: "logic-gates",
    name: "Logic gates",
    tag: "GATES",
    does: "Each gate applies one rule, such as AND, OR or NOT, to its input bits.",
    color: "#3e7064",
    inside: ["transistors"],
    shelf: 6,
    x: 190,
  },
  {
    id: "transistors",
    name: "Transistors",
    tag: "TRANSISTORS",
    does: "A transistor in a digital circuit acts as an electric switch with no moving parts.",
    color: "#7a6aa0",
    inside: ["voltages"],
    shelf: 7,
    x: 190,
  },
  {
    id: "voltages",
    name: "Voltages on wires",
    tag: "VOLTAGES",
    does: "Digital circuits usually interpret a high voltage as 1 and a low voltage as 0.",
    color: "#93cf6b",
    inside: [],
    shelf: 8,
    x: 190,
  },
];

/** Where a layer skips the layers between, or where the nesting loops back on itself. */
export const REACHES: readonly Reach[] = [
  { from: "app", to: "operating-system", label: "asks" },
  { from: "compiler-assembler", to: "app", label: "is an app" },
  { from: "app", to: "cpu", label: "runs directly" },
  { from: "input-output", to: "operating-system", label: "interrupts" },
  { from: "operating-system", to: "ram", label: "shares out" },
  { from: "buses", to: "ram", label: "wires" },
  { from: "buses", to: "input-output", label: "wires" },
];

/** The dolls on the shelves before anything is opened. */
export const OUTERMOST = ["app", "operating-system"] as const;

const byId = new Map(ABSTRACTION_LAYERS.map((layer) => [layer.id, layer]));

export function layerById(id: string): AbstractionLayer {
  const layer = byId.get(id);
  if (!layer) throw new Error(`No layer “${id}”.`);
  return layer;
}

/** Every doll that can be opened at all. */
export const OPENABLE = ABSTRACTION_LAYERS.filter((layer) => layer.inside.length > 0).map(
  (layer) => layer.id,
);

/**
 * The dolls standing out for a set of opened dolls. A doll is out while an open,
 * outstanding doll holds it, so a shared doll stays out until its last holder closes.
 */
export function dollsOut(opened: ReadonlySet<string>): Set<string> {
  const out = new Set<string>(OUTERMOST);
  const queue: string[] = [...OUTERMOST];
  while (queue.length) {
    const layer = layerById(queue.pop() as string);
    if (!opened.has(layer.id)) continue;
    for (const child of layer.inside) {
      if (!out.has(child)) {
        out.add(child);
        queue.push(child);
      }
    }
  }
  return out;
}

/** The open doll a doll came out of, or its first holder when it is back inside. */
export function holderOf(id: string, opened: ReadonlySet<string>, out: ReadonlySet<string>) {
  const holders = ABSTRACTION_LAYERS.filter((layer) => layer.inside.includes(id));
  return (
    holders.find((layer) => opened.has(layer.id) && out.has(layer.id)) ??
    holders.find((layer) => out.has(layer.id)) ??
    holders[0] ??
    null
  );
}

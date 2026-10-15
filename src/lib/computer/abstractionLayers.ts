/**
 * The layers a computer is made of, from the outside in, for the nesting doll
 * demo of chapter 1.0. Each layer only uses what the layer inside it does, so
 * a reader can stop opening at any point.
 */

export type SeriesPart = 1 | 2 | 3 | 4;

export type AbstractionLayer = {
  id: string;
  /** Shown on the panel (in capitals) and in the list of layers. */
  name: string;
  /** How the layer outside it names this one in its `builtFrom` sentence. */
  keyword: string;
  /** Painted on the doll: one or two short lines. */
  label: readonly string[];
  /** One plain sentence on what the layer does. */
  does: string;
  /** What the layer is built from: the next layer in. Null for the innermost. */
  builtFrom: string | null;
  /** The part of the series that covers the layer. */
  part: SeriesPart;
  /** The colour of the doll. */
  color: string;
};

export const PART_TITLES: Record<SeriesPart, string> = {
  1: "The basics",
  2: "The CPU",
  3: "Input and output",
  4: "Higher levels",
};

export const ABSTRACTION_LAYERS: readonly AbstractionLayer[] = [
  {
    id: "app",
    name: "The app you are using",
    keyword: "app",
    label: ["APP"],
    does: "It shows you this page and reacts when you scroll, click or type.",
    builtFrom: "It asks the operating system for a window, for files and for the network.",
    part: 4,
    color: "#b5543d",
  },
  {
    id: "operating-system",
    name: "Operating system",
    keyword: "operating system",
    label: ["OS"],
    does: "It shares the processor, the memory and the devices among all running programs.",
    builtFrom: "It is a program too, written in a programming language such as C.",
    part: 4,
    color: "#4b7d8c",
  },
  {
    id: "programming-languages",
    name: "Programming languages",
    keyword: "programming language",
    label: ["CODE"],
    does: "People write programs in them as text that other people can read.",
    builtFrom: "A compiler translates that text into machine code.",
    part: 2,
    color: "#cf9a3e",
  },
  {
    id: "machine-code",
    name: "Machine code",
    keyword: "machine code",
    label: ["MACHINE", "CODE"],
    does: "Each instruction is a number for one small step, such as adding two numbers.",
    builtFrom: "The CPU reads these numbers from memory and carries them out.",
    part: 2,
    color: "#5f6f9e",
  },
  {
    id: "cpu",
    name: "CPU",
    keyword: "CPU",
    label: ["CPU"],
    does: "It fetches, decodes and executes instructions, billions of times a second.",
    builtFrom: "A control unit steers the ALU, the registers, the RAM and the buses.",
    part: 2,
    color: "#8e5b80",
  },
  {
    id: "alu-registers-ram-buses",
    name: "ALU, registers, RAM and buses",
    keyword: "ALU",
    label: ["ALU", "RAM"],
    does: "These parts calculate with numbers, store them and move them around.",
    builtFrom: "Each part is built from adders, memory cells and multiplexers.",
    part: 2,
    color: "#6e9548",
  },
  {
    id: "adders-and-memory-cells",
    name: "Adders and memory cells",
    keyword: "adders",
    label: ["ADDER", "LATCH"],
    does: "Adders add binary numbers, and latches and flip-flops each hold one bit.",
    builtFrom: "Each one is a handful of logic gates wired together.",
    part: 1,
    color: "#c56b40",
  },
  {
    id: "logic-gates",
    name: "Logic gates",
    keyword: "logic gates",
    label: ["AND", "OR NOT"],
    does: "Each gate applies one rule, such as AND, OR or NOT, to its input bits.",
    builtFrom: "Each gate is a few transistors wired together.",
    part: 1,
    color: "#3e7064",
  },
  {
    id: "transistors",
    name: "Transistors",
    keyword: "transistors",
    label: ["SWITCH"],
    does: "A transistor is an electric switch with no moving parts.",
    builtFrom: "A voltage on one of its wires turns it on or off.",
    part: 1,
    color: "#7a6aa0",
  },
  {
    id: "voltages",
    name: "Voltages on wires",
    keyword: "voltage",
    label: ["VOLTS"],
    does: "A high voltage on a wire stands for 1, and a low voltage stands for 0.",
    builtFrom: null,
    part: 1,
    color: "#93cf6b",
  },
];

export const INNERMOST = ABSTRACTION_LAYERS.length - 1;

/** Shown at the innermost doll, which does not open. */
export const INNERMOST_NOTE = "The whole stack, app included, is voltages on tiny wires.";

/** The idea the chapter makes with the doll. */
export const KEY_IDEA =
  "Each layer only needs to know what the layer inside it does, not how. You can stop opening at any layer.";

export function clampDepth(depth: number): number {
  return Math.min(INNERMOST, Math.max(0, Math.round(depth)));
}

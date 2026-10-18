/**
 * A guided route from software to circuits for the nesting doll demo.
 * Some stops explain a smaller building block; others visit cooperating parts
 * at the same level. The transition text makes that relationship explicit.
 */

export type SeriesPart = 1 | 2 | 3 | 4;

export type AbstractionLayer = {
  id: string;
  /** Shown in the explanation and in the list of layers. */
  name: string;
  /** How the previous stop names this one in its `builtFrom` sentence. */
  keyword: string;
  /** Painted on the doll: one or two short lines. */
  label: readonly string[];
  /** One plain sentence on what the layer does. */
  does: string;
  /** A concrete example of the idea in use. */
  example: string;
  /** The connection to the next stop. Null for the innermost. */
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
    example: "Opening a doll changes a value in the program, which redraws the picture you see.",
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
    example:
      "Your browser and music player can run together because the operating system shares the computer between them.",
    builtFrom: "Its drivers connect programs to input and output devices.",
    part: 4,
    color: "#4b7d8c",
  },
  {
    id: "input-output",
    name: "Input and output",
    keyword: "input and output",
    label: ["IN", "OUT"],
    does: "Device controllers move data between the computer and its keyboard, screen, storage and other devices.",
    example:
      "A key press becomes a code the program can read, while a display controller sends pixels to the screen.",
    builtFrom: "The software that controls these devices starts as text in a programming language.",
    part: 3,
    color: "#c37b69",
  },
  {
    id: "programming-languages",
    name: "Programming languages",
    keyword: "programming language",
    label: ["CODE"],
    does: "A programming language lets people describe a program with named values, expressions and instructions.",
    example:
      "The expression score + 1 says what to calculate without specifying which wires should carry the numbers.",
    builtFrom:
      "For compiled programs, a compiler translates this text into lower-level instructions.",
    part: 2,
    color: "#cf9a3e",
  },
  {
    id: "compiler-assembler",
    name: "Compiler and assembler",
    keyword: "compiler",
    label: ["COMPILE"],
    does: "Compilers and assemblers translate readable source into instructions that a processor can execute.",
    example: "A compiler can turn score + 1 into a load, an addition and a store.",
    builtFrom: "The result is machine code for a particular kind of processor.",
    part: 2,
    color: "#a17c54",
  },
  {
    id: "machine-code",
    name: "Machine code",
    keyword: "machine code",
    label: ["MACHINE", "CODE"],
    does: "Machine code encodes instructions as bits that a particular processor knows how to read.",
    example:
      "An instruction contains an operation code and may also identify registers, a value or a memory address.",
    builtFrom: "The CPU reads these numbers from memory and carries them out.",
    part: 2,
    color: "#5f6f9e",
  },
  {
    id: "cpu",
    name: "CPU",
    keyword: "CPU",
    label: ["CPU"],
    does: "The CPU fetches instructions from memory, decodes them and performs their operations.",
    example:
      "A program counter holds the address of the next instruction, and a jump can change that address.",
    builtFrom: "Its control unit coordinates the work, using the clock to time each step.",
    part: 2,
    color: "#8e5b80",
  },
  {
    id: "control-unit-clock",
    name: "Control unit and clock",
    keyword: "control unit",
    label: ["CONTROL", "CLOCK"],
    does: "The control unit selects each step, while the clock sets the moments when stored values can change.",
    example:
      "An addition takes several steps in our toy CPU: fetch the instruction, select operands, then save the result.",
    builtFrom:
      "It sends control signals that choose when buses carry data between the processor's parts.",
    part: 2,
    color: "#a86453",
  },
  {
    id: "buses",
    name: "Buses",
    keyword: "buses",
    label: ["BUS"],
    does: "Buses carry values between the CPU, memory and devices over shared groups of wires.",
    example:
      "Eight data wires can carry one byte together, while separate address wires select where that byte goes.",
    builtFrom: "One destination is the ALU, which calculates with those values.",
    part: 2,
    color: "#537e89",
  },
  {
    id: "alu",
    name: "Arithmetic and logic unit",
    keyword: "ALU",
    label: ["ALU"],
    does: "The arithmetic and logic unit adds, subtracts, compares and applies logic to binary numbers.",
    example:
      "Two operands and an operation code enter the ALU, and a result and status flags come out.",
    builtFrom: "The ALU works alongside RAM, which holds the program and the data it needs.",
    part: 2,
    color: "#6e9548",
  },
  {
    id: "ram",
    name: "RAM",
    keyword: "RAM",
    label: ["RAM"],
    does: "RAM stores instructions and data at numbered addresses while a program runs.",
    example:
      "Reading address 42 returns the value stored there, and writing to address 42 replaces that value.",
    builtFrom: "The CPU keeps its current working values in smaller stores called registers.",
    part: 2,
    color: "#9b785d",
  },
  {
    id: "registers",
    name: "Registers",
    keyword: "registers",
    label: ["REG"],
    does: "Registers hold one word at a time, including operands, results and the address of the next instruction.",
    example:
      "An eight-bit register keeps eight bits together and replaces them when its load signal allows a clocked update.",
    builtFrom:
      "Multiplexers and decoders choose which values to read and which registers to write.",
    part: 2,
    color: "#94799c",
  },
  {
    id: "multiplexers-decoders",
    name: "Multiplexers and decoders",
    keyword: "multiplexers",
    label: ["SELECT"],
    does: "A multiplexer selects one input, while a decoder activates the output named by a binary code.",
    example:
      "Two address bits let a decoder select one of four registers, and a multiplexer returns the chosen value.",
    builtFrom:
      "These routing circuits work beside adders, another kind of circuit made from logic gates.",
    part: 2,
    color: "#477d74",
  },
  {
    id: "adders",
    name: "Adders",
    keyword: "adders",
    label: ["ADDER"],
    does: "An adder combines two binary numbers by calculating each sum bit and passing carries to the next position.",
    example: "Adding binary 1 and 1 produces a sum bit of 0 and a carry bit of 1.",
    builtFrom: "Adders calculate new values, while memory cells keep values for later.",
    part: 1,
    color: "#c56b40",
  },
  {
    id: "memory-cells",
    name: "Memory cells",
    keyword: "memory cells",
    label: ["LATCH", "BIT"],
    does: "Latches and flip-flops store one bit by feeding signals back through a circuit.",
    example:
      "A latch can keep its previous value after the input changes, until its control signal allows another update.",
    builtFrom: "These cells, adders and routing circuits can all be built from logic gates.",
    part: 1,
    color: "#b58d42",
  },
  {
    id: "logic-gates",
    name: "Logic gates",
    keyword: "logic gates",
    label: ["AND", "OR NOT"],
    does: "Each gate applies one rule, such as AND, OR or NOT, to its input bits.",
    example:
      "An AND gate outputs 1 only when both inputs are 1, regardless of what those bits represent.",
    builtFrom: "In a modern digital chip, transistors wired together implement each gate.",
    part: 1,
    color: "#3e7064",
  },
  {
    id: "transistors",
    name: "Transistors",
    keyword: "transistors",
    label: ["SWITCH"],
    does: "A transistor in a digital circuit acts as an electric switch with no moving parts.",
    example:
      "In a CMOS gate, complementary transistors connect the output toward either the supply voltage or ground.",
    builtFrom: "A voltage at its gate controls whether its channel conducts.",
    part: 1,
    color: "#7a6aa0",
  },
  {
    id: "voltages",
    name: "Voltages on wires",
    keyword: "voltage",
    label: ["VOLTS"],
    does: "Digital circuits usually interpret a high voltage as 1 and a low voltage as 0.",
    example:
      "The hardware accepts ranges of voltages as low or high, so a bit need not have one exact voltage.",
    builtFrom: null,
    part: 1,
    color: "#93cf6b",
  },
];

export const INNERMOST = ABSTRACTION_LAYERS.length - 1;

/** Shown at the innermost doll, which does not open. */
export const INNERMOST_NOTE =
  "Here the bits meet electricity: physical signals carry the values that every earlier layer uses.";

/** The idea the chapter makes with the doll. */
export const KEY_IDEA =
  "An abstraction lets you use a part without knowing every detail inside it. This route visits both smaller building blocks and cooperating parts.";

export function clampDepth(depth: number): number {
  return Math.min(INNERMOST, Math.max(0, Math.round(depth)));
}

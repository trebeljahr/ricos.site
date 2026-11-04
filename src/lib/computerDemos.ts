export const computerDemos = [
  { slug: "button-interrupts", title: "Build a button interrupt" },
  { slug: "keyboard-matrix", title: "Build a keyboard matrix" },
  { slug: "seven-segment", title: "Wire seven-segment decimal displays" },
  // Chapter 1.0: the layers a computer is made of.
  {
    slug: "abstraction-layers",
    title: "Open a computer, layer by layer",
  },
  {
    slug: "die-zoom",
    title: "Zoom into a real chip",
  },
  {
    slug: "byte-explorer",
    title: "One byte, many meanings",
  },
  {
    slug: "four-byte-explorer",
    title: "Four bytes, many meanings",
  },
  {
    slug: "switch-states",
    title: "Switch states",
  },
  {
    slug: "codebook",
    title: "Codebook",
  },
  {
    slug: "codebook-mismatch",
    title: "Codebook mismatch",
  },
  {
    slug: "letter-codebook",
    title: "Five switches, one alphabet",
  },
  {
    slug: "letter-typer",
    title: "Type letters, see five bits",
  },
  {
    slug: "ascii-table",
    title: "Explore the ASCII table",
  },
  {
    slug: "ascii-typer",
    title: "Type text, see the bits",
  },
  // Aside 1.1a: Unicode and UTF-8.
  {
    slug: "unicode-inspector",
    title: "Take any text apart",
  },
  {
    slug: "character-composer",
    title: "Build a character from code points",
  },
  {
    slug: "utf8-encoder",
    title: "Pack a code point into UTF-8 bytes",
  },
  {
    slug: "utf8-reader",
    title: "Read a UTF-8 byte stream",
  },
  {
    slug: "endian-reader",
    title: "Two bytes, four reading orders",
  },
  // Chapters 1.2 to 1.4: switches, gates, adders and the clock.
  {
    slug: "switch-logic",
    title: "Two switches, one lamp",
  },
  {
    slug: "switch-logic-parallel",
    title: "Two switches in parallel",
  },
  {
    slug: "transistor-comparison",
    title: "Compare PMOS and NMOS",
  },
  {
    slug: "transistor-switches",
    title: "Switches controlled by electricity",
  },
  {
    slug: "gate-truth-table",
    title: "Gate truth tables",
  },
  {
    slug: "addition-table",
    title: "Addition table",
  },
  {
    slug: "full-adder-table",
    title: "Full adder table",
  },
  {
    slug: "transistor-gates",
    title: "Gates wired from transistors",
  },
  {
    slug: "transistor-gates-nand",
    title: "A NAND gate from transistors",
  },
  {
    slug: "transistor-gate-builder",
    title: "Build gates from transistors",
  },
  {
    slug: "semiconductor",
    title: "From silicon to a transistor",
  },
  {
    slug: "transistor-shapes",
    title: "Four transistors in 3D",
  },
  {
    slug: "gate-wirings",
    title: "One gate, five wirings",
  },
  {
    slug: "half-adder-sum",
    title: "Half adder, sum only",
  },
  {
    slug: "half-adder",
    title: "Half adder",
  },
  {
    slug: "full-adder",
    title: "Full adder",
  },
  {
    slug: "eight-bit-adder",
    title: "Eight-bit adder",
  },
  {
    slug: "signed-number-explorer",
    title: "Signed numbers",
  },
  {
    slug: "signed-arithmetic",
    title: "Signed arithmetic",
  },
  {
    slug: "universal-nand-not",
    title: "NOT from NAND",
  },
  {
    slug: "universal-nand-and",
    title: "AND from NAND",
  },
  {
    slug: "universal-nand-or",
    title: "OR from NAND",
  },
  {
    slug: "universal-nand-nor",
    title: "NOR from NAND",
  },
  {
    slug: "universal-nand-xor",
    title: "XOR from NAND",
  },
  {
    slug: "universal-nand-xnor",
    title: "XNOR from NAND",
  },
  {
    slug: "universal-nor-not",
    title: "NOT from NOR",
  },
  {
    slug: "universal-nor-and",
    title: "AND from NOR",
  },
  {
    slug: "universal-nor-or",
    title: "OR from NOR",
  },
  {
    slug: "universal-nor-nand",
    title: "NAND from NOR",
  },
  {
    slug: "universal-nor-xor",
    title: "XOR from NOR",
  },
  {
    slug: "universal-nor-xnor",
    title: "XNOR from NOR",
  },
  {
    slug: "signal-edges",
    title: "Signal edges",
  },
  {
    slug: "clock-scope",
    title: "Clock scope",
  },
  {
    slug: "logic-builder",
    title: "Build a logic circuit",
  },
  {
    slug: "boolean-circuit",
    title: "Boolean expression and matching circuit",
  },
  {
    slug: "decoder-builder",
    title: "Build a decoder",
  },
  {
    slug: "decoder",
    title: "Decode the address",
  },
  {
    slug: "multiplexer",
    title: "Choose which signal gets through",
  },
  {
    slug: "memory-address",
    title: "Read and write one memory cell",
  },
  {
    slug: "alu-architecture",
    title: "ALU architecture comparison",
  },
  {
    slug: "instruction-encoder",
    title: "From instruction to bytes",
  },
  // The toy CPU running programs. The stepper demos (computer/stepperDemos.ts)
  // are independent: each puts one part of the same CPU in focus.
  {
    slug: "program-stepper",
    title: "From source code to CPU steps",
  },
  {
    slug: "call-stack",
    title: "Call a function and come back",
  },
  {
    slug: "stack-in-ram",
    title: "Keep the stack in RAM and recurse",
  },
  {
    slug: "key-interrupts",
    title: "Interrupt a program with a key press",
  },
  {
    slug: "microcode-table",
    title: "Edit the CPU's microcode table",
  },
  {
    slug: "cpu-circuit",
    title: "Run a program on the CPU circuit",
  },
  // Screens and the parts that draw on them.
  {
    slug: "memory-mapped-screen",
    title: "Draw on a screen by storing bytes",
  },
  {
    slug: "pixel-port",
    title: "Plot one pixel through a port",
  },
  {
    slug: "blitter",
    title: "Let a blitter draw while the CPU runs",
  },
  {
    slug: "scanout",
    title: "Read the screen out like a display",
  },
  {
    slug: "bank-window",
    title: "Reach a bigger screen through a window",
  },
  {
    slug: "vram-port",
    title: "Write the big screen through one port",
  },
  {
    slug: "big-blitter",
    title: "Fill and copy rectangles on the big screen",
  },
  {
    slug: "big-screens",
    title: "Why bigger screens need a GPU",
  },
  // Aside 5.6a: the 3D pipeline.
  {
    slug: "matrix-playground",
    title: "Multiply matrices, move a shape",
  },
  {
    slug: "matrices-in-3d",
    title: "Turn, scale and move in 3D",
  },
  {
    slug: "mesh-anatomy",
    title: "Take a 3D mesh apart",
  },
  {
    slug: "coordinate-spaces",
    title: "Follow a corner from mesh to pixel",
  },
  {
    slug: "triangle-raster",
    title: "Fill in a triangle, pixel by pixel",
  },
  {
    slug: "lighting-lab",
    title: "Light a surface, pixel by pixel",
  },
  {
    slug: "uv-unwrap",
    title: "Cut a mesh along seams and flatten it",
  },
  {
    slug: "bone-chain",
    title: "Turn a chain of bones",
  },
  {
    slug: "skinning",
    title: "Bend a mesh with two bones",
  },
  {
    slug: "weight-paint",
    title: "Paint vertex weights on a T. rex",
  },
  {
    slug: "skeleton-player",
    title: "Play keyframes through a skeleton",
  },
  {
    slug: "build-a-cpu",
    title: "Build your own CPU",
  },
  {
    slug: "build-from-nand",
    title: "Build a computer from transistors",
  },
  {
    slug: "builders-on-one-page",
    title: "Several circuit builders on one page",
  },
] as const;

export type ComputerDemoSlug = (typeof computerDemos)[number]["slug"];

// The demos that answer in production, gentlest first. Every other demo page
// stays development-only until the chapter it belongs to is out.
export const publicComputerDemos: { slug: ComputerDemoSlug; blurb: string }[] = [
  { slug: "die-zoom", blurb: "Zoom into a real Pentium II die, with a coin to scale." },
  { slug: "byte-explorer", blurb: "Read the same eight bits in different ways." },
  { slug: "ascii-typer", blurb: "Type text and read each character as seven bits." },
  { slug: "ascii-table", blurb: "Look up all 128 ASCII entries as characters, numbers and bits." },
  {
    slug: "unicode-inspector",
    blurb: "Type any text and read its graphemes, code points and UTF-8 bytes.",
  },
  {
    slug: "switch-logic",
    blurb: "Wire two switches, a battery and a lamp, then click the switches.",
  },
  { slug: "switch-logic-parallel", blurb: "Wire the same two switches in parallel and compare." },
  { slug: "full-adder", blurb: "Add two bits and a carry, and follow the signals through gates." },
  {
    slug: "logic-builder",
    blurb: "Place gates on a board, wire them up and watch signals travel.",
  },
];

const isProduction = process.env.NODE_ENV === "production";

/** The demos a reader can reach from another demo on this build. */
export const reachableComputerDemos = isProduction
  ? computerDemos.filter((demo) => publicComputerDemos.some(({ slug }) => slug === demo.slug))
  : computerDemos;

/** Where a demo page links back to on this build. */
export const computerDemosHome = isProduction
  ? { href: "/computer", label: "How computers work" }
  : { href: "/computer/demos", label: "All computer demos" };

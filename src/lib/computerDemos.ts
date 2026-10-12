export const computerDemos = [
  {
    slug: "byte-explorer",
    title: "One byte, many meanings",
  },
  {
    slug: "four-byte-explorer",
    title: "Four bytes, many meanings",
  },
  {
    slug: "codebook",
    title: "Switches, states and codebooks",
  },
  {
    slug: "letter-codebook",
    title: "Five switches, one alphabet",
  },
  {
    slug: "ascii-typer",
    title: "Type text, see the bits",
  },
  {
    slug: "endian-reader",
    title: "Two bytes, four reading orders",
  },
  {
    slug: "logic-builder",
    title: "Build a logic circuit",
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
  {
    slug: "build-a-cpu",
    title: "Build your own CPU",
  },
] as const;

export type ComputerDemoSlug = (typeof computerDemos)[number]["slug"];

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
  // The program stepper's ladder: each demo is the one before it plus one part.
  // The order matches STEPPER_LEVELS in computer/stepperLevels.ts.
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
    title: "Move the stack into RAM and recurse",
  },
  {
    slug: "key-interrupts",
    title: "Interrupt a program with a key press",
  },
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
    slug: "microcode-table",
    title: "Edit the CPU's microcode table",
  },
  {
    slug: "cpu-circuit",
    title: "Run a program on the CPU circuit",
  },
  {
    slug: "scanout",
    title: "Read the screen out like a display",
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

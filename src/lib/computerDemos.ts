export const computerDemos = [
  {
    slug: "byte-explorer",
    title: "One byte, many meanings",
    summary: "Flip eight bits. Read them as numbers, text, and color.",
  },
  {
    slug: "four-byte-explorer",
    title: "Four bytes, many meanings",
    summary: "Read 32 bits as a float, integer, emoji, or RGBA color.",
  },
  {
    slug: "logic-builder",
    title: "Build a logic circuit",
    summary: "Wire gates, run a clock, and save your own circuits.",
  },
  {
    slug: "instruction-encoder",
    title: "From instruction to bytes",
    summary: "Choose an instruction. Watch its bytes get decoded by the toy CPU.",
  },
  {
    slug: "program-stepper",
    title: "From source code to CPU steps",
    summary: "Compile a tiny program. Trace its bytes through a toy CPU, RAM, and output.",
  },
] as const;

export type ComputerDemoSlug = (typeof computerDemos)[number]["slug"];

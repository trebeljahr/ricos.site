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
    slug: "logic-builder",
    title: "Build a logic circuit",
  },
  {
    slug: "instruction-encoder",
    title: "From instruction to bytes",
  },
  {
    slug: "program-stepper",
    title: "From source code to CPU steps",
  },
  {
    slug: "cpu-circuit",
    title: "Run a program on the CPU circuit",
  },
  {
    slug: "build-a-cpu",
    title: "Build your own CPU",
  },
] as const;

export type ComputerDemoSlug = (typeof computerDemos)[number]["slug"];

// The program stepper's demos. Every demo runs the same toy CPU and puts one
// of its parts in focus, with programs that use that part. The demos are
// independent: none needs another one first. The stepper shows a part's
// readout on the demo about that part, and elsewhere only when the loaded
// program uses the part.

import type { ComputerDemoSlug } from "../computerDemos";
import {
  BIG_PORT,
  type CompiledProgram,
  INTERRUPT_SAMPLES,
  ISA,
  type IsaEntry,
  isBigBlitAddress,
  isBigScreenAddress,
  isBlitterAddress,
  isPixelPort,
  isScreenAddress,
  isWindowAddress,
  OPCODES,
  RAM_STACK_SAMPLES,
  SAMPLE_PROGRAMS,
  type StackModel,
} from "../computerStepper";

/** The parts of the toy machine that have a readout of their own in the stepper. */
export const STEPPER_PARTS = [
  "calls",
  "ramStack",
  "interrupts",
  "screen",
  "pixelPort",
  "blitter",
  "bankWindow",
  "vramPort",
  "bigBlitter",
  "microcode",
] as const;
export type StepperPart = (typeof STEPPER_PARTS)[number];

/** How a program is written: the source language, or assembly for the microcode table. */
export type ProgramLanguage = "source" | "assembly";

/** A program behind a preset button. */
export type StepperPreset = {
  label: string;
  source: string;
  /** The CPU the program needs; absent keeps the current one. */
  stack?: StackModel;
  /** Absent means the source language. */
  language?: ProgramLanguage;
  /** A tooltip for the button. */
  title?: string;
};

export type StepperDemo = {
  slug: ComputerDemoSlug;
  /** The part the demo is about; null for the plain CPU. */
  focus: StepperPart | null;
  /** What the part does and what to watch, shown above the stepper. */
  intro: string;
  /** Programs that use the part. The first one is loaded at the start. */
  presets: readonly StepperPreset[];
};

// A function that calls a function: the call stack holds two return addresses.
const NESTED =
  "fn double(n) {\n  return n + n;\n}\nfn quad(n) {\n  let d = double(n);\n  return double(d);\n}\nprint(quad(3));";
// The main program counts; each key press interrupts it and prints the key code.
const KEYS = "let count = 0;\nfn on_key(k) {\n  print(k);\n}\nloop {\n  count = count + 1;\n}";
// No handler, so no interrupt: the program asks the key port on every pass.
const POLLING = "let last = 0;\nloop {\n  last = key();\n}";
// The same sum as the first program, written as the instructions the compiler makes from it.
const ASSEMBLY = "; 2 + 3, one instruction per line\n  LDI 2\n  ADDI 3\n  OUT\n  HALT";

export const STEPPER_DEMOS: readonly StepperDemo[] = [
  {
    slug: "program-stepper",
    focus: null,
    intro:
      "The compiler turns each source line into two-byte instructions. Step the clock: the CPU fetches an instruction, decodes it, then executes it. Watch which register and which RAM byte each step changes.",
    presets: [
      { label: "2 + 3", source: SAMPLE_PROGRAMS.EXAMPLE },
      { label: "OVERFLOW", source: SAMPLE_PROGRAMS.OVERFLOW },
      { label: "FOR LOOP", source: SAMPLE_PROGRAMS.LOOP },
    ],
  },
  {
    slug: "call-stack",
    focus: "calls",
    intro:
      "CALL puts the address of the next instruction on the call stack and jumps to the function. RET takes that address off the stack and continues there. Step through the program and watch the stack fill and empty.",
    presets: [
      { label: "FUNCTION", source: SAMPLE_PROGRAMS.FUNCTION },
      {
        label: "NESTED",
        source: NESTED,
        title: "A function calls a function: two return addresses on the stack",
      },
    ],
  },
  {
    slug: "stack-in-ram",
    focus: "ramStack",
    intro:
      "This CPU keeps its stack in RAM. A stack pointer (SP) starts past the last RAM byte and counts down. Each call makes a frame there: the return address, the parameter and the locals. Each call has its own frame, so a function can call itself. Switch to the separate-stack CPU, and the compiler rejects the same program.",
    presets: [{ label: "RECURSION", source: RAM_STACK_SAMPLES.RECURSION, stack: "ram" }],
  },
  {
    slug: "key-interrupts",
    focus: "interrupts",
    intro:
      "A key press latches its code in the key port. The CPU finishes its instruction, then pushes PC and jumps to code address 02 instead of fetching. The handler on_key runs, and RETI returns to the interrupted code. Step a few phases, then type in the key field.",
    presets: [
      {
        label: "KEYBOARD",
        source: KEYS,
        title: "The program counts; a key press interrupts it",
      },
      {
        label: "POLLING",
        source: POLLING,
        title: "No interrupt: the program reads the key port on every pass",
      },
    ],
  },
  {
    slug: "microcode-table",
    focus: "microcode",
    intro:
      "The control unit runs each opcode from a table. Each opcode is a list of steps, and each step is the set of control lines that are on for one clock tick. Change a step or add an opcode, then write assembly that uses it. AND + JZ loads a worked example.",
    // Not "ASSEMBLY": that is the language switch's button.
    presets: [{ label: "2 + 3 BY HAND", source: ASSEMBLY, language: "assembly" }],
  },
  {
    slug: "memory-mapped-screen",
    focus: "screen",
    intro:
      "The 8×8 screen sits at data addresses F0 to F7. Each address holds one row, and each bit is one pixel, with bit 0 at the left. The CPU needs no new instruction: STM F3 stores ACC in row 3 the way it stores into RAM.",
    presets: [
      { label: "SMILEY", source: SAMPLE_PROGRAMS.SMILEY },
      {
        label: "SWEEP",
        source: SAMPLE_PROGRAMS.SWEEP,
        title: "Doubling a row byte moves its pixel one step right",
      },
      {
        label: "KEY ROW",
        source: INTERRUPT_SAMPLES.KEYBOARD,
        title: "Each key press draws its code as a row of pixels",
      },
    ],
  },
  {
    slug: "pixel-port",
    focus: "pixelPort",
    intro:
      "A store to a screen row replaces all 8 of its pixels. The pixel port at F8 to FA changes one: store x in F8, y in F9, then the colour in FA. plot(x, y) compiles to those three stores.",
    presets: [{ label: "PLOT", source: SAMPLE_PROGRAMS.CROSS }],
  },
  {
    slug: "blitter",
    focus: "blitter",
    intro:
      "The blitter sits at E0 to E4. The CPU stores a position and a command there. The blitter then draws one row or pixel per clock tick, while the CPU runs the next lines of its program. blit(wait) reads the BUSY bit until the blitter is done.",
    presets: [
      {
        label: "BLIT",
        source: SAMPLE_PROGRAMS.BLIT,
        title: "The blitter copies a sprite while the CPU counts",
      },
    ],
  },
  {
    slug: "vram-port",
    focus: "vramPort",
    intro:
      "The 32×32 screen has 128 bytes, and a port at D9 to DB reaches them one after another. Store a byte number in ADDR (D9). Each store to DATA (DA) then writes that byte and moves ADDR on by itself. STEP (DB) picks how far: one byte across, or one row (4 bytes) down.",
    presets: [{ label: "PORT", source: SAMPLE_PROGRAMS.PORT }],
  },
  {
    slug: "big-blitter",
    focus: "bigBlitter",
    intro:
      "The big blitter sits at DC to DF. FILL writes one byte into a rectangle of the 32×32 screen, and COPY copies a rectangle to another place. The CPU stores DST, SRC and SIZE and starts the command. The blitter then writes one byte per clock tick while the CPU runs on.",
    presets: [{ label: "STAMP", source: SAMPLE_PROGRAMS.STAMP }],
  },
];

/** The plain CPU's programs: what the stepper offers when a demo brings none. */
export const PLAIN_PRESETS = STEPPER_DEMOS[0].presets;

/** The opcodes that belong to a part. Parts not listed are reached through data addresses. */
const OPCODE_PARTS = new Map<number, StepperPart>([
  [OPCODES.CALL, "calls"],
  [OPCODES.RET, "calls"],
  [OPCODES.LDS, "ramStack"],
  [OPCODES.STS, "ramStack"],
  [OPCODES.ADDS, "ramStack"],
  [OPCODES.SUBS, "ramStack"],
  [OPCODES.ADDSP, "ramStack"],
  [OPCODES.IN, "interrupts"],
  [OPCODES.EI, "interrupts"],
  [OPCODES.DI, "interrupts"],
  [OPCODES.RETI, "interrupts"],
]);

/** The memory-mapped part behind a data address, or null for plain RAM. */
function addressPart(address: number): StepperPart | null {
  if (isPixelPort(address)) return "pixelPort";
  if (isScreenAddress(address)) return "screen";
  if (isBlitterAddress(address)) return "blitter";
  if (isBigBlitAddress(address)) return "bigBlitter";
  if (isWindowAddress(address) || address === BIG_PORT.bank) return "bankWindow";
  if (isBigScreenAddress(address)) return "vramPort";
  return null;
}

/**
 * The parts a program uses. `isa` says which opcodes take a data address;
 * pass an edited table's instruction set.
 */
export function partsUsed(
  program: CompiledProgram,
  isa: readonly IsaEntry[] = ISA,
): Set<StepperPart> {
  const used = new Set<StepperPart>();
  const kinds = new Map(isa.map((item) => [item.opcode, item.operand]));
  for (const { opcode, operand } of program.instructions) {
    const part =
      OPCODE_PARTS.get(opcode) ??
      (kinds.get(opcode) === "RAM address" ? addressPart(operand) : null);
    if (part) used.add(part);
  }
  return used;
}

// The program stepper as a ladder of machines. Each level is the level before
// it plus one part: a call stack, a stack in RAM, a key port, a screen, …
// A level's stepper shows only its machine: its compiler gate rejects a
// program that needs a part a later level adds and names the demo that adds
// it, and its CPU does not decode the opcodes of parts it lacks.

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
  type MicrocodeTable,
  OPCODES,
  RAM_STACK_SAMPLES,
  SAMPLE_PROGRAMS,
  type StackModel,
} from "../computerStepper";

/** The parts, in the order the levels add them. "cpu" is the base machine. */
export const STEPPER_PARTS = [
  "cpu",
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

export type StepperLevel = {
  /** The part this level adds; the level's machine has it and every part before it. */
  part: StepperPart;
  slug: ComputerDemoSlug;
  /** The part's name, for the nameplate and the list of models. */
  name: string;
  /** What the part is and what to watch, shown above the machine. */
  intro: string;
  /** Why a machine without the part rejects a program that needs it. */
  missing: string;
  /** Programs that show the part. The first one is loaded at the start. */
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

export const STEPPER_LEVELS: readonly StepperLevel[] = [
  {
    part: "cpu",
    slug: "program-stepper",
    name: "CPU",
    intro:
      "The compiler turns each source line into two-byte instructions. Step the clock: the CPU fetches an instruction, decodes it, then executes it. Watch which register and which RAM byte each step changes.",
    missing: "",
    presets: [
      { label: "2 + 3", source: SAMPLE_PROGRAMS.EXAMPLE },
      { label: "OVERFLOW", source: SAMPLE_PROGRAMS.OVERFLOW },
      { label: "FOR LOOP", source: SAMPLE_PROGRAMS.LOOP },
    ],
  },
  {
    part: "calls",
    slug: "call-stack",
    name: "CALL STACK",
    intro:
      "This machine adds a call stack and two instructions. CALL puts the address of the next instruction on the stack and jumps to the function. RET takes that address off the stack and continues there.",
    missing: "A function needs a call stack, and this machine has none yet.",
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
    part: "ramStack",
    slug: "stack-in-ram",
    name: "STACK IN RAM",
    intro:
      "This machine adds a second CPU that keeps its stack in RAM. A stack pointer (SP) starts past the last RAM byte and counts down. Each call makes a frame there: the return address, the parameter and the locals. Each call has its own frame, so a function can call itself.",
    missing: "A stack frame needs the stack-in-RAM CPU, and this machine does not have it yet.",
    presets: [
      {
        label: "RECURSION",
        source: RAM_STACK_SAMPLES.RECURSION,
        stack: "ram",
        title: "Needs the stack-in-RAM CPU; switches to it",
      },
    ],
  },
  {
    part: "interrupts",
    slug: "key-interrupts",
    name: "KEY PORT + INTERRUPTS",
    intro:
      "This machine adds a key port and an interrupt line. A key press latches its code in the port. The CPU finishes its instruction, then pushes PC and jumps to code address 02 instead of fetching. The handler on_key runs, and RETI returns to the interrupted code.",
    missing: "Keys need a key port, and this machine has none yet.",
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
    part: "screen",
    slug: "memory-mapped-screen",
    name: "SCREEN",
    intro:
      "This machine adds an 8×8 screen at data addresses F0 to F7. Each address holds one row, and each bit is one pixel, with bit 0 at the left. The CPU needs no new instruction: STM F3 stores ACC in row 3 the way it stores into RAM.",
    missing: "screen[…] needs a screen, and this machine has none yet.",
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
    part: "pixelPort",
    slug: "pixel-port",
    name: "PIXEL PORT",
    intro:
      "A store to a screen row replaces all 8 of its pixels. This machine adds a pixel port at F8 to FA that changes one: store x in F8, y in F9, then the colour in FA. plot(x, y) compiles to those three stores.",
    missing:
      "plot() and wait_vblank() need the pixel port, and this machine's screen has none yet.",
    presets: [{ label: "PLOT", source: SAMPLE_PROGRAMS.CROSS }],
  },
  {
    part: "blitter",
    slug: "blitter",
    name: "BLITTER",
    intro:
      "This machine adds a blitter at E0 to E4. The CPU stores a position and a command there. The blitter then draws one row or pixel per clock tick, while the CPU runs the next lines of its program. blit(wait) reads the BUSY bit until the blitter is done.",
    missing: "blit() needs a blitter, and this machine has none yet.",
    presets: [
      {
        label: "BLIT",
        source: SAMPLE_PROGRAMS.BLIT,
        title: "The blitter copies a sprite while the CPU counts",
      },
    ],
  },
  {
    part: "bankWindow",
    slug: "bank-window",
    name: "BIG SCREEN + BANK WINDOW",
    intro:
      "This machine adds a 32×32 screen of 128 bytes. Only 8 data addresses are free for it, D0 to D7, so they show one 8×8 tile at a time. The BANK register at D8 picks which of the 16 tiles the window shows.",
    missing: "bank() and window[…] need the big screen, and this machine has none yet.",
    presets: [{ label: "BANKS", source: SAMPLE_PROGRAMS.BANKS }],
  },
  {
    part: "vramPort",
    slug: "vram-port",
    name: "BIG SCREEN PORT",
    intro:
      "This machine adds a port into the big screen at D9 to DB. Store a byte number in ADDR (D9). Each store to DATA (DA) then writes that byte and moves ADDR on by itself. STEP (DB) picks how far: one byte across, or one row (4 bytes) down.",
    missing: "The vram calls need the big screen's port, and this machine has none yet.",
    presets: [{ label: "PORT", source: SAMPLE_PROGRAMS.PORT }],
  },
  {
    part: "bigBlitter",
    slug: "big-blitter",
    name: "BIG BLITTER",
    intro:
      "This machine adds a big blitter at DC to DF. FILL writes one byte into a rectangle of the big screen, and COPY copies a rectangle to another place. The CPU stores DST, SRC and SIZE and starts the command. The blitter then writes one byte per clock tick while the CPU runs on.",
    missing: "big_fill() and big_copy() need the big blitter, and this machine has none yet.",
    presets: [{ label: "STAMP", source: SAMPLE_PROGRAMS.STAMP }],
  },
  {
    part: "microcode",
    slug: "microcode-table",
    name: "MICROCODE TABLE",
    intro:
      "This machine opens the control unit's table. Each opcode is a list of steps, and each step is the set of control lines that are on for one clock tick. Change a step or add an opcode, then write assembly that uses it. AND + JZ loads a worked example.",
    missing: "",
    // Not "ASSEMBLY": that is the language switch's button.
    presets: [{ label: "2 + 3 BY HAND", source: ASSEMBLY, language: "assembly" }],
  },
];

export function stepperLevel(part: StepperPart): StepperLevel {
  return STEPPER_LEVELS[STEPPER_PARTS.indexOf(part)];
}

/** Whether the level's machine has the part: its own, or one an earlier level added. */
export const hasPart = (level: StepperLevel, part: StepperPart) =>
  STEPPER_PARTS.indexOf(part) <= STEPPER_PARTS.indexOf(level.part);

/** The level's model number, from 1: its place in the ladder. */
export const modelNumber = (level: StepperLevel) => STEPPER_PARTS.indexOf(level.part) + 1;

/** The presets of every level before this one, oldest first. */
export const earlierPresets = (level: StepperLevel): StepperPreset[] =>
  STEPPER_LEVELS.slice(0, STEPPER_PARTS.indexOf(level.part)).flatMap(({ presets }) => presets);

/** The opcodes each part adds to the CPU. Parts not listed are reached through data addresses. */
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
 * The parts a program uses beyond the base CPU, each with the first source
 * line that uses it; 0 when only compiler-added code does. `isa` says which
 * opcodes take a data address; pass an edited table's instruction set.
 */
export function partsUsed(
  program: CompiledProgram,
  isa: readonly IsaEntry[] = ISA,
): Map<StepperPart, number> {
  const used = new Map<StepperPart, number>();
  const kinds = new Map(isa.map((item) => [item.opcode, item.operand]));
  for (const { opcode, operand, line } of program.instructions) {
    const part =
      OPCODE_PARTS.get(opcode) ??
      (kinds.get(opcode) === "RAM address" ? addressPart(operand) : null);
    if (part && !used.get(part)) used.set(part, line);
  }
  return used;
}

/** A reason a level's machine cannot run a program, and the demo whose machine can. */
export type LevelProblem = { message: string; demo: ComputerDemoSlug | null };

/** The first part the program uses that this level's machine lacks, or null when it has them all. */
export function levelProblem(
  program: CompiledProgram,
  level: StepperLevel,
  isa: readonly IsaEntry[] = ISA,
): LevelProblem | null {
  const used = partsUsed(program, isa);
  for (const later of STEPPER_LEVELS.slice(modelNumber(level))) {
    const line = used.get(later.part);
    if (line === undefined) continue;
    return { message: `${line ? `Line ${line}: ` : ""}${later.missing}`, demo: later.slug };
  }
  return null;
}

/**
 * A compile error as a level problem. The compiler rejects recursion on the
 * separate-stack CPU and names the stack-in-RAM CPU; on a level without that
 * CPU, the problem points at the demo that adds it.
 */
export function compileProblem(message: string, level: StepperLevel): LevelProblem {
  const needsRamStack = /stack-in-RAM CPU/.test(message) && !hasPart(level, "ramStack");
  return { message, demo: needsRamStack ? stepperLevel("ramStack").slug : null };
}

/** `table` without the opcodes of parts this level lacks: its CPU does not decode them. */
export function levelMicrocode(table: MicrocodeTable, level: StepperLevel): MicrocodeTable {
  const opcodes = table.opcodes.filter(({ opcode }) => {
    const part = OPCODE_PARTS.get(opcode);
    return !part || hasPart(level, part);
  });
  return opcodes.length === table.opcodes.length ? table : { ...table, opcodes };
}

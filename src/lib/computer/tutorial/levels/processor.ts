// Processor: the build-your-own-CPU ladder as tutorial levels. Each starts from
// the toy CPU with only the parts that level needs, earlier levels' wiring done
// and locked, and grades by running test programs next to the program stepper.
import { compileProgram, hex } from "../../../computerStepper";
import { formatBus } from "../../bus";
import { type GradeFailure, gradeCpu, type TickSide } from "../../cpuGrader";
import {
  CPU_LEVEL_SPECS,
  cpuLevelSetup,
  enforceLocks,
  restoreLevel,
  saveLevel,
  solvedLevel,
  withProgram,
} from "../../cpuLevels";
import type { Circuit } from "../../logic";
import type { ChapterLink, CustomGrade, Level } from "../types";
import { CHAPTERS, once } from "./shared";

const SECTION = "Processor";

const bytes = (values: number[] | undefined) =>
  values ? values.map(hex).join(" ") || "empty" : "—";
const byte = (value: number | undefined) => (value === undefined ? "—" : hex(value));

function describeSide(side: TickSide, field: string): string {
  if (field === "control") return side.control.join(" ") || "no lines";
  if (field === "bus")
    return `${formatBus(side.bus.value)}${side.bus.drivers.length ? ` from ${side.bus.drivers.join(" + ")}` : ""}`;
  if (field === "RAM") return bytes(side.ram);
  if (field === "SCREEN") return bytes(side.screen);
  if (field === "STACK") return bytes(side.stack);
  if (field === "settle") return "settles";
  return byte(side.probes[field as keyof TickSide["probes"]]);
}

/** Half cycles to show a failure: before the tick's edge for control and bus, after it for state. */
const halfCyclesFor = (failure: GradeFailure) =>
  failure.wrong.every((field) => field === "control" || field === "bus")
    ? failure.tick * 2
    : failure.tick * 2 + 2;

/** Runs every test program of CPU level `number` (1-based) on the reader's circuit. */
export function gradeCpuLevel(circuit: Circuit, number: number): CustomGrade {
  const setup = cpuLevelSetup(number);
  const spec = CPU_LEVEL_SPECS[number - 1];
  for (const program of setup.programs) {
    const loaded = withProgram(circuit, program.compiled.bytes);
    const graded = gradeCpu(loaded, program.compiled, { level: spec.grade });
    if (graded.pass) continue;
    if ("structure" in graded)
      return {
        pass: false,
        summary: "The grader cannot find every part yet:",
        problems: graded.structure,
      };
    const { failure } = graded;
    return {
      pass: false,
      summary: `Program “${program.name}” goes wrong at tick ${failure.tick} (T${failure.t} of ${failure.instruction.text} at ${hex(failure.instruction.address)}). ${failure.cause.message}`,
      table: {
        head: ["What", "Expected", "Your CPU"],
        rows: failure.wrong.map((field) => [
          field,
          describeSide(failure.expected, field),
          describeSide(failure.actual, field),
        ]),
      },
      highlight: failure.cause.part,
      replay: {
        circuit: loaded,
        halfCycles: halfCyclesFor(failure),
      },
    };
  }
  return {
    pass: true,
    summary: `Pass: all ${setup.programs.length} test programs match the stepper tick for tick.`,
  };
}

/** Loads `source`, compiled, into the CPU's code ROM; throws when it does not compile. */
export function loadProgram(circuit: Circuit, source: string) {
  const compiled = compileProgram(source);
  return { compiled, circuit: withProgram(circuit, compiled.bytes) };
}

const CHAPTER_OF: ChapterLink[] = [
  CHAPTERS.counter,
  CHAPTERS.buses,
  CHAPTERS.alu,
  CHAPTERS.ram,
  CHAPTERS.control,
  CHAPTERS.together,
];

const WIRING_TIP =
  "The parts and the wires already in place are locked. Shift-drag across a row of ports to select them, then drag onto another row to wire all eight lanes at once.";

export const PROCESSOR_LEVELS: Level[] = CPU_LEVEL_SPECS.map((spec, index): Level => {
  const number = index + 1;
  const setup = once(() => cpuLevelSetup(number));
  return {
    id: `cpu-${number}`,
    title: spec.title,
    section: SECTION,
    chapter: CHAPTER_OF[index],
    goal: spec.goal,
    intro:
      number === 1
        ? `From here you wire a whole CPU. Its blocks are the built-in versions of parts you built: registers, a counter, the ALU and RAM. ${WIRING_TIP}`
        : WIRING_TIP,
    spec: {
      kind: "custom",
      describe: `Runs ${spec.tests.length} test programs (${spec.tests.map((test) => test.name).join(", ")}) tick for tick next to the program stepper.`,
      grade: (circuit) => gradeCpuLevel(circuit, number),
    },
    palette: spec.palette,
    start: () => {
      const current = setup();
      return {
        circuit: current.start,
        locked: [...current.lockedNodes],
        enforce: (circuit: Circuit) => enforceLocks(circuit, current),
      };
    },
    reference: once(() => solvedLevel(setup())),
    hints: spec.steps.map((text) => ({ text, when: () => true })),
    save: (circuit) => saveLevel(circuit, setup()),
    restore: (saved) => restoreLevel(saved, setup()),
  };
});

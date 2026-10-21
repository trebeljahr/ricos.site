import { expect, it } from "vitest";
import { SIGNALS } from "../../../computerStepper";
import { buttonCpuCircuit } from "../../buttonInterrupt";
import { CPU_PARTS } from "../../cpuPreset";
import { INPUT_DEVICE_CORE_LESSONS } from "../../inputDeviceLessons";
import { levelStart } from "../kit";
import { gradeInterruptCpu, INPUT_DEVICE_LEVELS } from "./inputDevices";

it("checks handler entry, acknowledge and return against every CPU tick", () => {
  expect(gradeInterruptCpu(buttonCpuCircuit()).pass).toBe(true);
});
it.each([
  "VEC_OUT",
  "PC_IN",
  "IE_CLR",
  "IE_SET",
  "STACK_OUT",
] as const)("rejects a missing %s connection even with a prebuilt handler", (signal) => {
  const circuit = buttonCpuCircuit();
  circuit.wires = circuit.wires.filter(
    (wire) => wire.from !== CPU_PARTS.control || wire.output !== SIGNALS.indexOf(signal),
  );
  expect(gradeInterruptCpu(circuit).pass).toBe(false);
});
it("starts with missing CPU interrupt wiring, protects the supplied datapath and offers the stage directly", () => {
  const level = INPUT_DEVICE_LEVELS.find((level) => level.id === "cpu-interrupt-entry")!;
  const start = levelStart(level);
  expect(INPUT_DEVICE_CORE_LESSONS).toContain(level.id);
  expect(start.circuit.wires.length).toBeLessThan(level.reference!().wires.length);
  expect(gradeInterruptCpu(start.circuit).pass).toBe(false);
  const full = level.reference!();
  expect(start.enforce(full).wires.length).toBe(full.wires.length);
});

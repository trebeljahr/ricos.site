// Every build-your-own-CPU level is solvable: wired the way G's preset is, the
// grader passes all its test programs; left as the level starts, it does not.
import { describe, expect, it } from "vitest";
import { OPCODES } from "../computerStepper";
import { checkStructure, gradeCpu } from "./cpuGrader";
import {
  CPU_LEVEL_SPECS,
  cpuLevelSetup,
  enforceLocks,
  restoreLevel,
  saveLevel,
  solvedLevel,
  wireKey,
  withProgram,
} from "./cpuLevels";

const levels = CPU_LEVEL_SPECS.map((_, index) => index + 1);
const mnemonics = Object.fromEntries(Object.entries(OPCODES).map(([name, code]) => [code, name]));

/** Opcodes each level may run; level 1 grades only the fetch, so jumps would derail it. */
const ALLOWED: Record<number, string[]> = {
  1: ["LDI", "STM", "LDM", "ADDI", "OUT", "HALT"],
  2: ["LDI", "OUT", "HALT"],
  3: ["LDI", "ADDI", "SUBI", "OUT", "HALT"],
  4: ["LDI", "ADDI", "SUBI", "OUT", "HALT", "LDM", "STM", "ADDM", "SUBM"],
  5: ["LDI", "ADDI", "SUBI", "OUT", "HALT", "LDM", "STM", "ADDM", "SUBM", "JMP", "JNC"],
  6: Object.keys(OPCODES),
};

describe("build-your-own-CPU levels", () => {
  for (const level of levels) {
    const setup = cpuLevelSetup(level);
    const spec = CPU_LEVEL_SPECS[level - 1];

    it(`level ${level} (${spec.title}) is solved by the preset's wiring`, () => {
      const solved = solvedLevel(setup);
      expect(checkStructure(solved, spec.grade)).toEqual([]);
      for (const program of setup.programs) {
        const result = gradeCpu(withProgram(solved, program.compiled.bytes), program.compiled, {
          level: spec.grade,
        });
        expect(result, program.name).toMatchObject({ pass: true });
      }
    });

    it(`level ${level} needs wiring before it passes`, () => {
      expect(setup.solution.length).toBeGreaterThan(0);
      const program = setup.programs[0];
      const result = gradeCpu(withProgram(setup.start, program.compiled.bytes), program.compiled, {
        level: spec.grade,
      });
      expect(result.pass).toBe(false);
    });

    it(`level ${level} test programs use only its instructions`, () => {
      for (const program of setup.programs)
        for (const instruction of program.compiled.instructions)
          expect(ALLOWED[level], program.name).toContain(mnemonics[instruction.opcode]);
    });
  }

  it("keeps earlier levels' wiring and adds each level's parts", () => {
    for (const level of levels.slice(1)) {
      const before = cpuLevelSetup(level - 1);
      const now = cpuLevelSetup(level);
      for (const id of before.lockedNodes) expect(now.lockedNodes.has(id)).toBe(true);
      for (const wire of solvedLevel(before).wires)
        expect(now.lockedWires.has(wireKey(wire)), wireKey(wire)).toBe(true);
    }
  });

  it("puts back locked parts and wires but keeps the reader's wiring", () => {
    const setup = cpuLevelSetup(2);
    const reader = setup.solution[0];
    const locked = setup.start.wires[0];
    const broken = {
      ...setup.start,
      nodes: setup.start.nodes
        .filter((node) => node.id !== "acc")
        .map((node) => (node.id === "out" ? { ...node, label: "renamed", x: node.x + 40 } : node)),
      wires: [...setup.start.wires.filter((wire) => wire !== locked), reader],
    };
    const fixed = enforceLocks(broken, setup);
    expect(fixed.nodes.find((node) => node.id === "acc")).toBeDefined();
    const out = fixed.nodes.find((node) => node.id === "out")!;
    expect(out.label).toBe(setup.start.nodes.find((node) => node.id === "out")!.label);
    expect(out.x).toBe(setup.start.nodes.find((node) => node.id === "out")!.x + 40);
    expect(fixed.wires.map(wireKey)).toContain(wireKey(locked));
    expect(fixed.wires).toContain(reader);
    expect(enforceLocks(fixed, setup)).toBe(fixed);
    // The builder works on a copy: an unchanged copy passes as it is.
    const copy = JSON.parse(JSON.stringify(setup.start));
    expect(enforceLocks(copy, setup)).toBe(copy);
  });

  it("saves only the reader's changes and restores them", () => {
    const setup = cpuLevelSetup(3);
    const solved = solvedLevel(setup);
    const saved = JSON.parse(JSON.stringify(saveLevel(solved, setup)));
    expect(saved.added).toEqual([]);
    expect(saved.wires).toHaveLength(setup.solution.length);
    expect(JSON.stringify(saved).length).toBeLessThan(10_000);
    const restored = restoreLevel(saved, setup);
    expect(restored.wires.map(wireKey).sort()).toEqual(solved.wires.map(wireKey).sort());
    expect(restoreLevel("garbage", setup)).toBe(setup.start);
  });
});

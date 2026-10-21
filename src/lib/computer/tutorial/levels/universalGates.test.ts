import { describe, expect, it } from "vitest";
import type { Circuit } from "../../logic";
import { gradeLevel, gradePassed } from "../grade";
import { levelStart } from "../kit";
import { CATALOG, LEARNING_LEVELS, LEVELS } from "./index";
import { UNIVERSAL_GATE_LEVELS } from "./universalGates";

describe("universal gate construction", () => {
  it("registers all fourteen independent practices without changing earned parts or the learning ladder", () => {
    expect(UNIVERSAL_GATE_LEVELS).toHaveLength(14);
    expect(new Set(UNIVERSAL_GATE_LEVELS.map((level) => level.id)).size).toBe(14);
    for (const level of UNIVERSAL_GATE_LEVELS) {
      expect(LEVELS).toContain(level);
      expect(LEARNING_LEVELS).not.toContain(level);
      expect(level.makes).toBeUndefined();
      expect(level.optional).toBe(true);
      expect(level.palette).toHaveLength(1);
      expect(level.palette[0]).toMatch(/^(nand|nor)$/);
      expect(level.steps).toBeUndefined();
      expect(level.hints?.every((hint) => hint.when === undefined)).toBe(true);
    }
    expect(CATALOG.parts.get("not")?.level.id).toBe("not");
    expect(CATALOG.parts.get("nand")?.level.id).toBe("cmos-nand");
  });

  describe.each(
    UNIVERSAL_GATE_LEVELS.map((level) => [level.id, level] as const),
  )("%s", (_, level) => {
    const start = levelStart(level);
    const allowed = CATALOG.allowed(level);
    const grade = (circuit: Circuit) => gradeLevel(circuit, level, start.locked, allowed);

    it("passes its reference using only the chosen primitive", () => {
      const reference = level.reference!();
      const primitiveTypes = reference.nodes
        .filter((node) => !start.locked.includes(node.id))
        .map((node) => node.type);
      expect(primitiveTypes.length).toBeGreaterThan(0);
      expect(new Set(primitiveTypes)).toEqual(new Set(level.palette));
      const result = grade(reference);
      expect(result.kind).toBe("truth");
      expect(gradePassed(result)).toBe(true);
      if (result.kind === "truth") {
        expect(result.rows).toHaveLength(
          level.spec.kind === "truth" ? 2 ** level.spec.inputs.length : 0,
        );
        expect(result.rows.every((row) => row.actual[0] === row.expected[0])).toBe(true);
      }
    });

    it("rejects an empty board and a fully connected wrong output", () => {
      expect(gradePassed(grade(start.circuit))).toBe(false);
      const reference = level.reference!();
      const wrong: Circuit = {
        ...reference,
        wires: reference.wires.map((wire) => (wire.to === "out" ? { ...wire, from: "a" } : wire)),
      };
      const result = grade(wrong);
      expect(result.kind).toBe("truth");
      expect(gradePassed(result)).toBe(false);
      if (result.kind === "truth") expect(result.rows.some((row) => !row.pass)).toBe(true);
    });

    it("rejects a forbidden primitive and a boxed shortcut", () => {
      const reference = level.reference!();
      const forbidden: Circuit = {
        ...reference,
        nodes: [
          ...reference.nodes,
          { id: "extra", type: level.palette[0] === "nand" ? "nor" : "nand", x: 400, y: 400 },
        ],
      };
      expect(grade(forbidden).kind).toBe("structure");
      const boxed: Circuit = {
        ...start.circuit,
        nodes: [
          ...start.circuit.nodes,
          { id: "shortcut", type: "module", module: reference, part: "not", x: 400, y: 40 },
        ],
        wires: [{ id: "shortcut-out", from: "shortcut", to: "out", input: 0 }],
      };
      expect(grade(boxed).kind).toBe("structure");
      expect(allowed.parts.size).toBe(0);
    });
  });
});

import { describe, expect, it } from "vitest";
import { gradeLevel } from "../grade";
import { levelStart } from "../kit";
import { applyAction, matchReference, nextAction } from "../matcher";
import { PartCatalog } from "../parts";
import { PROCESSOR_LEVELS } from "./processor";

const catalog = new PartCatalog(PROCESSOR_LEVELS);

describe("processor levels", () => {
  it("fails the fetch level from its start and passes once Show me wires it", () => {
    const level = PROCESSOR_LEVELS[0];
    const start = levelStart(level);
    if (level.spec.kind !== "custom") throw new Error("CPU levels use a custom check");
    expect(level.spec.grade(start.circuit).pass).toBe(false);
    const reference = level.reference!();
    let circuit = start.circuit;
    let count = 0;
    for (; count < 400; count++) {
      const action = nextAction(
        circuit,
        reference,
        matchReference(circuit, reference, start.locked, catalog.gateParts),
      );
      if (!action) break;
      circuit = applyAction(circuit, action, (ref) => ({ ...ref, id: `mine-${count}` }));
    }
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(400);
    const checked = gradeLevel(start.enforce(circuit), level, start.locked, catalog.allowed(level));
    expect(checked.kind).toBe("custom");
    if (checked.kind !== "custom") throw new Error(JSON.stringify(checked));
    expect(checked.result.summary).toMatch(/Pass/);
  }, 120_000);

  it("keeps drafts in the compact saved form", () => {
    const level = PROCESSOR_LEVELS[1];
    const start = levelStart(level);
    const saved = level.save!(start.circuit) as { added: unknown[]; wires: unknown[] };
    expect(saved.added).toEqual([]);
    expect(saved.wires).toEqual([]);
    expect(level.restore!(saved)?.nodes.length).toBe(start.circuit.nodes.length);
  });
});

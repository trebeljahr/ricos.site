import { describe, expect, it } from "vitest";
import { parseCircuitStorage, stringifyCircuitStorage } from "./circuitStorage";
import { LEVELS } from "./tutorial/levels";

describe("circuit storage", () => {
  it("keeps small saves in their existing JSON format", () => {
    const value = { current: { name: "Starter", nodes: [], wires: [] }, saved: {} };
    expect(stringifyCircuitStorage(value)).toBe(JSON.stringify(value));
    expect(parseCircuitStorage(JSON.stringify(value))).toEqual(value);
  });

  it("fits every reference solution and draft within localStorage with room for demo saves", () => {
    const solved: Record<string, unknown> = {};
    const drafts: Record<string, unknown> = {};
    for (const level of LEVELS) {
      if (!level.reference) continue;
      const circuit = level.reference();
      solved[level.id] = { at: 1, circuit };
      drafts[level.id] = level.save ? level.save(circuit) : circuit;
    }
    const progress = { solved, drafts, skipped: [], settings: { ownParts: "mine" } };
    const stored = stringifyCircuitStorage(progress);
    expect(stored.length * 2).toBeLessThan(4 * 1024 * 1024);
    expect(JSON.stringify(parseCircuitStorage(stored)) === JSON.stringify(progress)).toBe(true);
  });

  it.each([
    { data: { $circuit: 0 }, pool: [{ $circuit: 0 }] },
    { data: { $circuit: 1 }, pool: [{}] },
    { data: { $circuit: -1 }, pool: [{}] },
    { data: { $circuit: "0" }, pool: [{}] },
    { data: {}, pool: null },
  ])("rejects malformed and cyclic pool references", (value) => {
    expect(() =>
      parseCircuitStorage(JSON.stringify({ format: "ricos-circuit-pool-v1", ...value })),
    ).toThrow();
  });
});

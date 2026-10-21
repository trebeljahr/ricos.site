// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from "vitest";
import type { Circuit } from "../logic";
import { PROGRESS_KEY, progressStore } from "./progress";

beforeEach(() => {
  localStorage.clear();
  progressStore.reset();
});
afterEach(() => progressStore.reset());

it("restores validated solutions and drafts from a compact progress save", () => {
  const circuit: Circuit = {
    name: "My circuit",
    nodes: [
      { id: "a", type: "switch", x: 0, y: 0 },
      { id: "out", type: "lamp", x: 200, y: 0 },
    ],
    wires: [{ id: "wire", from: "a", to: "out", input: 0 }],
  };
  const solved = Object.fromEntries(
    Array.from({ length: 1500 }, (_, index) => [`level-${index}`, { at: index, circuit }]),
  );
  progressStore.update((progress) => ({ ...progress, solved, drafts: { current: circuit } }));
  expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!).format).toBe("ricos-circuit-pool-v1");
  progressStore.reset();
  const restored = progressStore.get();
  expect(Object.keys(restored.solved)).toHaveLength(1500);
  expect(restored.solved["level-1499"].circuit).toMatchObject(circuit);
  expect(restored.drafts.current).toMatchObject(circuit);
});

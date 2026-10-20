import { expect, it } from "vitest";
import { initialSnapshot } from "./logic";
import { wireSignal } from "./wireAppearance";

it("reads the individual output, including a low output on a live multi-output source", () => {
  const snapshot = { ...initialSnapshot(), values: { source: true }, outputs: { source: [true, false] } };
  expect(wireSignal(snapshot, "source", 0)).toBe("high");
  expect(wireSignal(snapshot, "source", 1)).toBe("low");
  expect(wireSignal(snapshot, "missing")).toBe("low");
});

it("keeps floating and conflicting buses distinct from binary low", () => {
  const snapshot = { ...initialSnapshot(), buses: { floating: "Z" as const, conflict: "X" as const, zero: 0, active: 128 } };
  expect(wireSignal(snapshot, "floating", 0, 8)).toBe("floating");
  expect(wireSignal(snapshot, "conflict", 0, 8)).toBe("conflict");
  expect(wireSignal(snapshot, "zero", 0, 8)).toBe("low");
  expect(wireSignal(snapshot, "active", 0, 8)).toBe("high");
});

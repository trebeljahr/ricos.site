import { describe, expect, it } from "vitest";
import { ABSTRACTION_LAYERS, clampDepth, INNERMOST, PART_TITLES } from "./abstractionLayers";

describe("abstraction layers", () => {
  it("runs from the app outside to voltages on wires inside", () => {
    expect(ABSTRACTION_LAYERS[0].id).toBe("app");
    expect(ABSTRACTION_LAYERS[INNERMOST].id).toBe("voltages");
    const ids = ABSTRACTION_LAYERS.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("connects each explanation to the next stop on the route", () => {
    ABSTRACTION_LAYERS.forEach((layer, index) => {
      const inner = ABSTRACTION_LAYERS[index + 1];
      if (!inner) {
        expect(layer.builtFrom).toBeNull();
        return;
      }
      expect(layer.builtFrom?.toLowerCase()).toContain(inner.keyword.toLowerCase());
    });
  });

  it("links each stop to a known part of the series", () => {
    expect(ABSTRACTION_LAYERS[INNERMOST].part).toBe(1);
    for (const layer of ABSTRACTION_LAYERS) expect(PART_TITLES[layer.part]).toBeTruthy();
  });

  it("provides hexadecimal colors for the doll's SVG gradients", () => {
    for (const layer of ABSTRACTION_LAYERS) {
      expect(layer.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("keeps a depth inside the doll", () => {
    expect(clampDepth(-3)).toBe(0);
    expect(clampDepth(4)).toBe(4);
    expect(clampDepth(2.6)).toBe(3);
    expect(clampDepth(42)).toBe(INNERMOST);
  });
});

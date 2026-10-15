import { describe, expect, it } from "vitest";
import { ABSTRACTION_LAYERS, clampDepth, INNERMOST, PART_TITLES } from "./abstractionLayers";

const sentences = ABSTRACTION_LAYERS.flatMap((layer) =>
  layer.builtFrom ? [layer.does, layer.builtFrom] : [layer.does],
);

describe("abstraction layers", () => {
  it("runs from the app outside to voltages on wires inside", () => {
    expect(ABSTRACTION_LAYERS).toHaveLength(10);
    expect(ABSTRACTION_LAYERS[0].id).toBe("app");
    expect(ABSTRACTION_LAYERS[INNERMOST].id).toBe("voltages");
    const ids = ABSTRACTION_LAYERS.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("builds every layer except the innermost from the next one in", () => {
    ABSTRACTION_LAYERS.forEach((layer, index) => {
      const inner = ABSTRACTION_LAYERS[index + 1];
      if (!inner) {
        expect(layer.builtFrom).toBeNull();
        return;
      }
      expect(layer.builtFrom?.toLowerCase()).toContain(inner.keyword.toLowerCase());
    });
  });

  it("is covered by the series from the inside out", () => {
    // Part 1 starts at the innermost doll; no layer is in a later part than one outside it.
    for (let index = 1; index < ABSTRACTION_LAYERS.length; index++)
      expect(ABSTRACTION_LAYERS[index].part).toBeLessThanOrEqual(
        ABSTRACTION_LAYERS[index - 1].part,
      );
    expect(ABSTRACTION_LAYERS[INNERMOST].part).toBe(1);
    for (const layer of ABSTRACTION_LAYERS) expect(PART_TITLES[layer.part]).toBeTruthy();
  });

  it("paints each doll in its own colour with a short label", () => {
    const colors = ABSTRACTION_LAYERS.map((layer) => layer.color);
    expect(new Set(colors).size).toBe(colors.length);
    for (const layer of ABSTRACTION_LAYERS) {
      expect(layer.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(layer.label.length).toBeGreaterThanOrEqual(1);
      expect(layer.label.length).toBeLessThanOrEqual(2);
      for (const line of layer.label) expect(line.length).toBeLessThanOrEqual(7);
    }
  });

  it("says each thing in one short sentence", () => {
    for (const sentence of sentences) {
      expect(sentence).toMatch(/^[A-Z].*\.$/);
      expect(sentence.slice(0, -1)).not.toMatch(/[.!?] /);
      expect(sentence.split(" ").length).toBeLessThanOrEqual(20);
    }
  });

  it("keeps a depth inside the doll", () => {
    expect(clampDepth(-3)).toBe(0);
    expect(clampDepth(4)).toBe(4);
    expect(clampDepth(2.6)).toBe(3);
    expect(clampDepth(42)).toBe(INNERMOST);
  });
});

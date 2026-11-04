import { describe, expect, it } from "vitest";
import {
  ABSTRACTION_LAYERS,
  dollsOut,
  holderOf,
  layerById,
  OPENABLE,
  OUTERMOST,
  REACHES,
} from "./abstractionLayers";

describe("abstraction layers", () => {
  it("starts with two programs side by side and ends at voltages", () => {
    expect([...dollsOut(new Set())].sort()).toEqual([...OUTERMOST].sort());
    const all = dollsOut(new Set(OPENABLE));
    expect(all.size).toBe(ABSTRACTION_LAYERS.length);
    expect(layerById("voltages").inside).toEqual([]);
  });

  it("gives every doll a unique id and known dolls inside it", () => {
    const ids = ABSTRACTION_LAYERS.map((layer) => layer.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const layer of ABSTRACTION_LAYERS) {
      for (const child of layer.inside) expect(ids).toContain(child);
      // A doll holds only dolls on its own shelf or lower.
      for (const child of layer.inside) {
        expect(layerById(child).shelf).toBeGreaterThanOrEqual(layer.shelf);
      }
    }
    for (const { from, to } of REACHES) {
      expect(ids).toContain(from);
      expect(ids).toContain(to);
    }
  });

  it("shows that the stack is not a line", () => {
    const holders = (id: string) =>
      ABSTRACTION_LAYERS.filter((layer) => layer.inside.includes(id)).length;
    expect(holders("logic-gates")).toBeGreaterThan(2);
    expect(layerById("cpu").inside.length).toBeGreaterThan(1);
    expect(REACHES.some((reach) => reach.from === "compiler-assembler" && reach.to === "app")).toBe(
      true,
    );
  });

  it("keeps a shared doll out until its last holder closes", () => {
    const opened = new Set([
      "app",
      "programming-languages",
      "compiler-assembler",
      "machine-code",
      "cpu",
      "ram",
      "registers",
    ]);
    expect(dollsOut(opened).has("memory-cells")).toBe(true);
    opened.delete("ram");
    expect(dollsOut(opened).has("memory-cells")).toBe(true);
    opened.delete("registers");
    expect(dollsOut(opened).has("memory-cells")).toBe(false);
  });

  it("puts away what is inside a closed doll, even if opened further down", () => {
    const opened = new Set(["app", "programming-languages", "compiler-assembler"]);
    expect(dollsOut(opened).has("machine-code")).toBe(true);
    opened.delete("app");
    const out = dollsOut(opened);
    expect(out.has("programming-languages")).toBe(false);
    expect(out.has("machine-code")).toBe(false);
  });

  it("sends a doll back into a holder that is out", () => {
    const opened = new Set(["operating-system"]);
    const out = dollsOut(opened);
    expect(holderOf("programming-languages", opened, out)?.id).toBe("operating-system");
    expect(holderOf("app", opened, out)).toBeNull();
  });

  it("provides hexadecimal colors for the dolls", () => {
    for (const layer of ABSTRACTION_LAYERS) expect(layer.color).toMatch(/^#[0-9a-f]{6}$/);
  });
});

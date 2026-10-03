import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { UnfoldedCanvas } from "../../components/computer/UnfoldedCanvas";
import { LogicBuilder } from "../../components/computer/LogicBuilder";
import { BLUEPRINTS, type Circuit, initialSnapshot, PRESETS, step } from "./logic";
import { buildImplementation, collectUnfoldableIds } from "./implementation";

describe("hierarchical circuit unfolding", () => {
  it("offers unfolding on the normal circuit board", () => {
    const markup = renderToStaticMarkup(createElement(LogicBuilder));
    expect(markup).toContain("Unfold SUM");
    expect(markup).not.toContain("Full CMOS diagram");
  });
  it("renders the unfolded circuit on the canvas with per-box controls", () => {
    const markup = renderToStaticMarkup(
      createElement(UnfoldedCanvas, {
        circuit: PRESETS["8-bit ALU"],
        unfolded: new Set(collectUnfoldableIds(PRESETS["8-bit ALU"])),
        onToggle: () => {},
        onUnfoldAll: () => {},
        onFoldAll: () => {},
        onEnter: () => {},
        snapshot: initialSnapshot(),
        onToggleSwitch: () => {},
        showVdd: true,
        showGround: true,
        onVddChange: () => {},
        onGroundChange: () => {},
      }),
    );
    expect(markup).toContain("Unfold all");
    expect(markup).toContain("Jump to group");
    expect(markup).toContain("CMOS XOR");
    expect(markup).toContain("PMOS");
    expect(markup).toContain("NMOS");
  });
  it("unfolds an ALU one level at a time", () => {
    const circuit = PRESETS["8-bit ALU"];
    const first = buildImplementation(circuit, new Set(["bit0"]));
    expect(first.nodes.some((node) => node.id === "bit0/adder" && node.type === "module")).toBe(
      true,
    );
    expect(first.nodes.some((node) => node.id === "bit1" && node.type === "module")).toBe(true);
    const second = buildImplementation(circuit, new Set(["bit0", "bit0/adder"]));
    expect(
      second.nodes.some((node) => node.id === "bit0/adder/half1" && node.type === "module"),
    ).toBe(true);
    const third = buildImplementation(circuit, new Set(["bit0", "bit0/adder", "bit0/adder/half1"]));
    expect(
      third.nodes.some((node) => node.id === "bit0/adder/half1/xor" && node.type === "xor"),
    ).toBe(true);
    const fourth = buildImplementation(
      circuit,
      new Set(["bit0", "bit0/adder", "bit0/adder/half1", "bit0/adder/half1/xor"]),
    );
    expect(
      fourth.nodes.some(
        (node) => node.id.startsWith("bit0/adder/half1/xor/") && node.type === "pmos",
      ),
    ).toBe(true);
  });
  it("expands every example and gate blueprint to transistor-level parts", () => {
    for (const circuit of [...Object.values(PRESETS), ...Object.values(BLUEPRINTS)]) {
      const diagram = buildImplementation(circuit);
      const ids = new Set(diagram.nodes.map((node) => node.id));
      expect(ids.size, circuit.name).toBe(diagram.nodes.length);
      expect(diagram.transistorCount, circuit.name).toBeGreaterThan(0);
      expect(
        diagram.nodes.every(
          (node) =>
            !["not", "and", "or", "xor", "xnor", "nand", "nor", "dff", "module"].includes(
              node.type,
            ),
        ),
        circuit.name,
      ).toBe(true);
      expect(
        diagram.wires.every((wire) => ids.has(wire.from) && ids.has(wire.to)),
        circuit.name,
      ).toBe(true);
      expect(diagram.groups.length, circuit.name).toBeGreaterThan(0);
    }
  });

  it("retains the external wiring of a half adder", () => {
    const diagram = buildImplementation(PRESETS["Half adder"]);
    const circuit: Circuit = {
      name: "expanded half adder",
      nodes: diagram.nodes,
      wires: diagram.wires,
    };
    for (const a of [false, true])
      for (const b of [false, true]) {
        const state = step(circuit, initialSnapshot(), false, {}, { a, b });
        expect([state.values.sum, state.values.carry]).toEqual([a !== b, a && b]);
      }
  });

  it("expands nested black boxes and flip-flops", () => {
    const circuit: Circuit = {
      name: "nested logic",
      nodes: [
        { id: "data", type: "switch", x: 0, y: 0 },
        { id: "clock", type: "clock", x: 0, y: 100 },
        { id: "box", type: "module", module: PRESETS["Clocked memory"], x: 200, y: 0 },
        { id: "out", type: "lamp", x: 400, y: 0 },
      ],
      wires: [
        { id: "a", from: "data", to: "box", input: 0 },
        { id: "b", from: "clock", to: "box", input: 1 },
        { id: "c", from: "box", to: "out", input: 0 },
      ],
    };
    const diagram = buildImplementation(circuit);
    expect(diagram.groups.some((group) => group.label.includes("master–slave NAND"))).toBe(true);
    expect(diagram.groups.some((group) => group.label === "Clocked memory")).toBe(true);
    expect(diagram.nodes.some((node) => node.type === "dff" || node.type === "module")).toBe(false);
    expect(diagram.wires.some((wire) => wire.from === "data" && wire.to === "box/data")).toBe(true);
  });
});

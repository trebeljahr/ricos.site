import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ImplementationView } from "../../components/computer/ImplementationView";
import { BLUEPRINTS, type Circuit, initialSnapshot, PRESETS, step } from "./logic";
import { buildImplementation } from "./implementation";

describe("full CMOS implementation", () => {
  it("renders the complete diagram with navigation and labeled groups", () => {
    const markup = renderToStaticMarkup(
      createElement(ImplementationView, {
        circuit: PRESETS["8-bit ALU"],
        onClose: () => {},
        showVdd: true,
        showGround: true,
        onVddChange: () => {},
        onGroundChange: () => {},
      }),
    );
    expect(markup).toContain("full implementation");
    expect(markup).toContain("Jump to group");
    expect(markup).toContain("CMOS XOR");
    expect(markup).toContain("PMOS");
    expect(markup).toContain("NMOS");
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

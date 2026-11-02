import { describe, expect, it } from "vitest";
import { gateBlueprint, inputLabel, type Node, outputLabel } from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";
import { transistorPortPoint, transistorPortSide } from "./transistorGeometry";

describe("MOSFET schematic terminals", () => {
  it.each(["nmos", "pmos"] as const)(
    "names and places %s terminals on their actual leads",
    (type) => {
      const node: Node = { id: "t", type, x: 10, y: 20 };
      expect(inputLabel(node, 0)).toBe("Gate (G)");
      expect(inputLabel(node, 1)).toBe("Source (S)");
      expect(outputLabel(node, 0)).toBe("Drain (D)");
      expect(transistorPortPoint(node, 0, "input")).toEqual({ x: 10, y: 86 });
      expect(transistorPortPoint(node, 1, "input")).toEqual({
        x: 98,
        y: type === "pmos" ? 20 : 152,
      });
      expect(transistorPortPoint(node, 0, "output")).toEqual({
        x: 98,
        y: type === "pmos" ? 152 : 20,
      });
      for (const side of ["left", "top", "right", "bottom"] as const) {
        const rotated = { ...node, inputSide: side };
        expect(transistorPortSide(rotated, 0, "input")).toBe(side);
        for (const [kind, index] of [
          ["input", 0],
          ["input", 1],
          ["output", 0],
        ] as const) {
          const point = transistorPortPoint(rotated, index, kind);
          const portSide = transistorPortSide(rotated, index, kind);
          expect(
            portSide === "left"
              ? point.x === node.x
              : portSide === "right"
                ? point.x === node.x + nodeWidth(node)
                : portSide === "top"
                  ? point.y === node.y
                  : point.y === node.y + nodeHeight(node),
          ).toBe(true);
        }
      }
    },
  );

  it.each(["not", "nand", "nor", "and", "or", "xor", "xnor"] as const)(
    "draws %s with pull-ups above and pull-downs below its output",
    (gate) => {
      const circuit = gateBlueprint(gate, "transistor");
      const output = circuit.nodes.find((node) => node.id === "out")!;
      const outputY = output.y + nodeHeight(output) / 2;
      expect(
        circuit.nodes
          .filter((node) => node.type === "pmos")
          .every((node) => node.y + nodeHeight(node) < outputY),
      ).toBe(true);
      expect(
        circuit.nodes.filter((node) => node.type === "nmos").every((node) => node.y > outputY),
      ).toBe(true);
      for (const wire of circuit.wires) {
        const from = circuit.nodes.find((node) => node.id === wire.from)!;
        const to = circuit.nodes.find((node) => node.id === wire.to)!;
        if (from.type === "pmos" || from.type === "nmos")
          expect(wire.points?.[0]).toEqual(transistorPortPoint(from, 0, "output"));
        if (to.type === "pmos" || to.type === "nmos")
          expect(wire.points?.at(-1)).toEqual(transistorPortPoint(to, wire.input, "input"));
      }
    },
  );
});

import { expect, it } from "vitest";
import { cmosLampLayout } from "./cmosLampLayout";
import { transistorLampDemo } from "./demoCircuits";
import { isMosfet } from "./transistorGeometry";

it.each(["series", "parallel", "not", "nand", "nor", "xor", "xnor"] as const)(
  "keeps %s selector plates clear of power wires",
  (gate) => {
    const circuit = transistorLampDemo(gate);
    const layout = cmosLampLayout(circuit);
    for (const control of circuit.nodes.filter((node) => node.type === "switch")) {
      const x = layout.positions.get(control.id)!.x;
      const left = x - 60,
        right = x + 60;
      const top = layout.selectorY - 32,
        bottom = layout.selectorY + 44;
      for (const wire of layout.wires) {
        const target = circuit.nodes.find((node) => node.id === wire.to)!;
        if (isMosfet(target) && wire.input === 0) continue;
        for (const [index, end] of wire.points.slice(1).entries()) {
          const start = wire.points[index];
          const crosses =
            start.x === end.x
              ? start.x > left &&
                start.x < right &&
                Math.max(start.y, end.y) > top &&
                Math.min(start.y, end.y) < bottom
              : start.y > top &&
                start.y < bottom &&
                Math.max(start.x, end.x) > left &&
                Math.min(start.x, end.x) < right;
          expect(crosses, `${control.id} overlaps power wire ${wire.id}`).toBe(false);
        }
      }
    }
  },
);

it("labels the signal-fed selector as XOR rather than an inverter of B", () => {
  const layout = cmosLampLayout(transistorLampDemo("xnor"));
  expect(layout.stages.map((stage) => layout.labels.get(stage.id))).toEqual(["Ā", "XOR", "OUT"]);
});

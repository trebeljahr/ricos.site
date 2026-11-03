import { expect, it } from "vitest";
import { cmosLampLayout, SELECTOR_THROW } from "./cmosLampLayout";
import { transistorLampDemo } from "./demoCircuits";
import { isMosfet } from "./transistorGeometry";

it.each(["series", "parallel", "not", "nand", "nor", "xor", "xnor"] as const)(
  "keeps %s selector plates clear of power wires",
  (gate) => {
    const circuit = transistorLampDemo(gate);
    const layout = cmosLampLayout(circuit);
    for (const control of circuit.nodes.filter((node) => node.type === "switch")) {
      const input = layout.inputSwitches.find((input) => input.id === control.id)!;
      const x = input.x;
      const left = x - 77,
        right = x + 77;
      const top = input.y - 72,
        bottom = input.y + 47;
      for (const wire of layout.wires) {
        const target = circuit.nodes.find((node) => node.id === wire.to)!;
        if (isMosfet(target) && wire.input === 0) continue;
        for (const [index, end] of wire.points.slice(1).entries()) {
          const start = wire.points[index];
          if (wire.from === control.id && index === 0) continue; // Its own terminal stub enters the plate.
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

it.each(["series", "parallel", "not", "nand", "nor", "xor", "xnor"] as const)(
  "connects every %s input at its real switch and transistor terminals",
  (gate) => {
    const circuit = transistorLampDemo(gate);
    const layout = cmosLampLayout(circuit);
    for (const input of layout.inputSwitches) {
      const supply = layout.inputWires.find((wire) => wire.id === `${input.id}-supply`)!;
      expect(supply.points[0]).toEqual(layout.positions.get("vcc"));
      expect(supply.points.at(-1)).toEqual(input.high);
      const ground = layout.inputWires.find((wire) => wire.id === `${input.id}-ground`)!;
      expect(ground.points[0].y).toEqual(layout.groundY);
      expect(ground.points.at(-1)).toEqual(input.low);
      expect(input.high).toEqual({ x: input.x - 56, y: input.y - SELECTOR_THROW });
      expect(input.low).toEqual({ x: input.x - 56, y: input.y + SELECTOR_THROW });
      expect(input.output).toEqual({ x: input.x + 56, y: input.y });
      for (const wire of layout.wires.filter((wire) => wire.from === input.id)) {
        expect(wire.points[0]).toEqual(input.output);
      }
    }
    for (const wire of layout.wires) {
      const target = circuit.nodes.find((node) => node.id === wire.to)!;
      if (isMosfet(target) && wire.input === 0) {
        const p = layout.positions.get(target.id)!;
        expect(wire.points.at(-1)).toEqual({ x: p.x - 46, y: p.y });
      }
      for (const [index, end] of wire.points.slice(1).entries()) {
        const start = wire.points[index];
        expect(start.x === end.x || start.y === end.y, `${wire.id} is orthogonal`).toBe(true);
        for (const node of circuit.nodes.filter(isMosfet)) {
          const p = layout.positions.get(node.id)!;
          const crosses =
            start.x === end.x
              ? start.x > p.x - 36 &&
                start.x < p.x + 36 &&
                Math.max(start.y, end.y) > p.y - 27 &&
                Math.min(start.y, end.y) < p.y + 27
              : start.y > p.y - 27 &&
                start.y < p.y + 27 &&
                Math.max(start.x, end.x) > p.x - 36 &&
                Math.min(start.x, end.x) < p.x + 36;
          expect(crosses, `${wire.id} crosses transistor ${node.id}`).toBe(false);
        }
      }
      for (const p of wire.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(layout.width);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(layout.height);
      }
    }
  },
);

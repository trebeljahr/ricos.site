import { type Circuit, initialSnapshot, step } from "../../logic";
import type { Level } from "../types";

/** Sources are primitive controls; the learner constructs their bit interface. */
export const INPUT_LEVELS: Level[] = ([4, 8] as const).map((width) => {
  const nodes: Circuit["nodes"] = [
    { id: "number", type: width === 4 ? "input4" : "input8", x: 40, y: 60, numberValue: 0 },
    ...Array.from({ length: width }, (_, bit) => ({
      id: `bit${bit}`,
      type: "lamp" as const,
      x: 650,
      y: 40 + bit * 125,
      label: `WEIGHT ${2 ** bit}`,
    })),
  ];
  const reference = (): Circuit => ({
    name: `${width}-bit numeric interface`,
    nodes,
    wires: Array.from({ length: width }, (_, bit) => ({
      id: `bit${bit}`,
      from: "number",
      output: bit,
      to: `bit${bit}`,
      input: 0,
    })),
  });
  return {
    id: `numeric-input-${width}`,
    title: `Interpret a ${width}-bit number source`,
    section: "Inputs and events",
    optional: true,
    goal: `Make the lamps represent the unsigned source value from 0 to ${2 ** width - 1}. Each lamp names its binary weight.`,
    intro:
      "A numeric source supplies several Boolean signals at once. The value is the sum of the lit lamps’ weights. Bit 0 has weight 1. Choose the correspondence, then test values with several bits set.",
    palette: ["not", "and", "or", "xor"],
    start: () => ({ circuit: { ...reference(), wires: [] }, locked: nodes.map((node) => node.id) }),
    reference,
    spec: {
      kind: "custom",
      describe: `All ${2 ** width} unsigned source values`,
      grade: (circuit) => {
        for (let value = 0; value < 2 ** width; value++) {
          const test = {
            ...circuit,
            nodes: circuit.nodes.map((node) =>
              node.id === "number" ? { ...node, numberValue: value } : node,
            ),
          };
          const snapshot = step(test, initialSnapshot(), false);
          for (let bit = 0; bit < width; bit++) {
            const expected = Boolean(value & (2 ** bit));
            if (snapshot.unstable || Boolean(snapshot.values[`bit${bit}`]) !== expected)
              return {
                pass: false,
                summary: `At source ${value}, the weight-${2 ** bit} lamp should be ${expected ? "on" : "off"}. Compare this case with a value containing just one set bit.`,
              };
          }
        }
        return { pass: true, summary: `Every ${width}-bit value has the correct weighted lamps.` };
      },
    },
    hints: [
      {
        text: "Try powers of two first. Which single lamp should light? Then choose a value with two set bits.",
      },
    ],
  };
});

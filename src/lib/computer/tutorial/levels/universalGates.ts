import { layoutCircuit } from "../../circuitLayout";
import { evalGate, GATE_RULES } from "../../gateLogic";
import { GATE_NAMES, gateBlueprint, type LogicGate } from "../../logic";
import type { Level } from "../types";
import { A, B, CHAPTERS, OUT, once } from "./shared";

export const UNIVERSAL_FAMILIES = ["nand", "nor"] as const;
export type UniversalFamily = (typeof UNIVERSAL_FAMILIES)[number];
export const universalTargets = (family: UniversalFamily) =>
  GATE_NAMES.filter((target) => target !== family);

export const universalGateId = (family: UniversalFamily, target: LogicGate) =>
  `universal-${family}-${target}`;

const targetHints: Record<LogicGate, string> = {
  not: "Compare the primitive's rows where its two inputs have the same value. What happens to that shared value?",
  and: "Only one target row is 1. Which intermediate conditions could distinguish that row from the other three?",
  or: "Only one target row is 0. What must be true about each input in that case?",
  nand: "The target is low only when both inputs are high. Compare that condition with the part you have.",
  nor: "The target is high only when both inputs are low. Compare that condition with the part you have.",
  xor: "Separate the two unequal-input cases from the equal-input cases. What common conditions could intermediate signals identify?",
  xnor: "The output is high for both equal-input cases. How could you express the opposite of the unequal-input condition?",
};

/** Isolated practice never awards replacement parts or changes the main construction ladder. */
export const UNIVERSAL_GATE_LEVELS: Level[] = UNIVERSAL_FAMILIES.flatMap((family) =>
  universalTargets(family).map((target): Level => {
    const id = universalGateId(family, target);
    const title = `${target.toUpperCase()} from ${family.toUpperCase()}`;
    return {
      id,
      title,
      section: `Only ${family.toUpperCase()}`,
      chapter: CHAPTERS.universal,
      optional: true,
      // A unique family keeps a chapter embed on its own target and primitive.
      practice: { family: id, label: title },
      goal: `${GATE_RULES[target]} Build this ${target.toUpperCase()} function using only ${family.toUpperCase()} gates.`,
      intro:
        "Choose your own wiring. The expected truth table specifies the result. Check compares every row with your circuit. Hints appear only when requested.",
      palette: [family],
      spec: {
        kind: "truth",
        inputs: target === "not" ? [A] : [A, B],
        outputs: [OUT],
        fn: ([a, b]) => [evalGate(target, a, b)],
      },
      reference: once(() => {
        const circuit = gateBlueprint(target, family);
        return layoutCircuit({
          ...circuit,
          name: title,
          nodes: circuit.nodes.map((node) =>
            node.id === "out" ? { ...node, label: "OUT" } : node,
          ),
        });
      }),
      hints: [
        { text: targetHints[target] },
        {
          text:
            family === "nand"
              ? "NAND is low only when both of its inputs are high. Track what each intermediate signal means before adding another gate."
              : "NOR is high only when both of its inputs are low. Track what each intermediate signal means before adding another gate.",
        },
        {
          text: "A signal can feed more than one gate input. Compare one failing row with a neighboring passing row before changing the circuit.",
        },
      ],
    };
  }),
);

import { layoutCircuit } from "../../circuitLayout";
import { evalGate, GATE_RULES } from "../../gateLogic";
import { GATE_NAMES, gateBlueprint, type LogicGate } from "../../logic";
import type { Level } from "../types";
import { gateConstructionHints } from "./gateHints";
import { A, B, CHAPTERS, OUT, once } from "./shared";

export const UNIVERSAL_FAMILIES = ["nand", "nor"] as const;
export type UniversalFamily = (typeof UNIVERSAL_FAMILIES)[number];
export const universalTargets = (family: UniversalFamily) =>
  GATE_NAMES.filter((target) => target !== family);

export const universalGateId = (family: UniversalFamily, target: LogicGate) =>
  `universal-${family}-${target}`;

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
      goal: `${GATE_RULES[target]} Build this ${target.toUpperCase()} function using only ${family.toUpperCase()} gates. Once it works, find a solution with the fewest gates.`,
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
      hints: gateConstructionHints(family, target),
      sizeGoal: {
        metric: "gates",
        minimum: gateBlueprint(target, family).nodes.filter((node) => node.type === family).length,
        unit: `${family.toUpperCase()} gate`,
      },
    };
  }),
);

import { layoutCircuit } from "../../circuitLayout";
import { evalGate } from "../../gateLogic";
import { GATE_NAMES, gateBlueprint, type LogicGate } from "../../logic";
import type { Level } from "../types";
import { gateConstructionHints } from "./gateHints";
import { A, B, OUT, once } from "./shared";

export const UNIVERSAL_FAMILIES = ["nand", "nor"] as const;
export type UniversalFamily = (typeof UNIVERSAL_FAMILIES)[number];
export const universalTargets = (family: UniversalFamily) =>
  GATE_NAMES.filter((target) => target !== family);

export const universalGateId = (family: UniversalFamily, target: LogicGate) =>
  `universal-${family}-${target}`;

/** One gate to place and a page heading that already names the task: the rest of the interface is noise. */
const SINGLE_TASK_BUILDER = {
  title: false,
  fileMenu: false,
  viewMenu: false,
  partSearch: false,
  ownParts: false,
} as const;

/** Isolated practice never awards replacement parts or changes the main construction ladder. */
export const UNIVERSAL_GATE_LEVELS: Level[] = UNIVERSAL_FAMILIES.flatMap((family) =>
  universalTargets(family).map((target): Level => {
    const id = universalGateId(family, target);
    const title = `${target.toUpperCase()} from ${family.toUpperCase()}`;
    return {
      id,
      title,
      section: `Only ${family.toUpperCase()}`,
      optional: true,
      // A unique family keeps a chapter embed on its own target and primitive.
      practice: { family: id, label: title },
      goal: `Build ${target.toUpperCase()} using only ${family.toUpperCase()} gates.`,
      intro: `The truth table lists every setting of the ${target === "not" ? "switch" : "switches"} and the value OUT must show. Wire the circuit so that OUT matches every row.`,
      builder: SINGLE_TASK_BUILDER,
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

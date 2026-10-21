import { type BlueprintFamily, gateBlueprint, type LogicGate } from "../../logic";
import type { LevelHint } from "../types";

type PrimitiveFamily = Extract<BlueprintFamily, "nand" | "nor">;

const CORE_IDEAS: Record<PrimitiveFamily, Record<LogicGate, string>> = {
  nand: {
    not: "A NAND gate with the same signal on both inputs inverts that signal. Compare the 00 and 11 rows.",
    and: "NAND gives the opposite of AND. A NAND with tied inputs can invert that intermediate result.",
    or: "De Morgan's law gives A OR B = NOT(NOT A AND NOT B). Invert each input, then use NAND to combine the inverted signals.",
    nand: "The available NAND gate already computes this function. Match A and B to its inputs.",
    nor: "NOR is the inverse of OR. Build OR from NAND gates using De Morgan's law, then invert that result with a tied-input NAND.",
    xor: "Reuse A NAND B as the 'not both' condition. Combining each input with that shared condition lets the remaining NAND stages distinguish the two unequal-input cases from 00 and 11.",
    xnor: "Equality is the inverse of XOR. Build the unequal-input condition with NAND gates, then invert it with a tied-input NAND.",
  },
  nor: {
    not: "A NOR gate with the same signal on both inputs inverts that signal. Compare the 00 and 11 rows.",
    and: "De Morgan's law gives A AND B = NOT(NOT A OR NOT B). Invert each input, then use NOR to combine the inverted signals.",
    or: "NOR gives the opposite of OR. A NOR with tied inputs can invert that intermediate result.",
    nand: "NAND is the inverse of AND. Build AND from NOR gates using De Morgan's law, then invert that result with a tied-input NOR.",
    nor: "The available NOR gate already computes this function. Match A and B to its inputs.",
    xor: "Reuse A NOR B to isolate the A-only and B-only cases. Their NOR detects equality; a final NOR can invert that result to produce XOR.",
    xnor: "Reuse A NOR B to isolate the A-only and B-only cases. A NOR of those two unequal-input conditions is 1 for equal inputs, which is XNOR.",
  },
};

/** Requested guidance only: reasoning, size, then a complete signal plan. */
export function gateConstructionHints(
  family: PrimitiveFamily,
  target: LogicGate,
  { reusableParts = false }: { reusableParts?: boolean } = {},
): LevelHint[] {
  const reference = gateBlueprint(target, family);
  const gates = reference.nodes.filter((node) => node.type === family);
  const primitive = family.toUpperCase();
  const signals = new Map(reference.nodes.map((node) => [node.id, node.label]));
  gates.forEach((gate, index) => {
    signals.set(gate.id, `G${index + 1}`);
  });
  const plan = gates.map((gate) => {
    const inputs = reference.wires
      .filter((wire) => wire.to === gate.id)
      .sort((a, b) => a.input - b.input)
      .map((wire) => signals.get(wire.from));
    return `${signals.get(gate.id)} = ${primitive}(${inputs.join(", ")})`;
  });
  const output = reference.wires.find((wire) => wire.to === "out")!;
  return [
    { title: "Core idea", text: CORE_IDEAS[family][target] },
    {
      title: "Gate count",
      text: `One construction uses ${gates.length} ${primitive} ${gates.length === 1 ? "gate" : "gates"}.${
        reusableParts
          ? ` This counts a ${primitive}-only route; reusable earned parts can reduce the visible block count.`
          : ""
      }`,
    },
    {
      title: "Signal plan",
      text: `Name the gate outputs G1, G2, and so on. ${plan.join(". ")}. Connect ${signals.get(output.from)} to OUT. Repeated names mean reuse that signal, not another gate.`,
    },
  ];
}

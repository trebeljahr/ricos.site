import { type BlueprintFamily, gateBlueprint, type LogicGate } from "../../logic";
import type { LevelHint } from "../types";

type PrimitiveFamily = Extract<BlueprintFamily, "nand" | "nor">;

const CORE_IDEAS: Record<PrimitiveFamily, Record<LogicGate, string>> = {
  nand: {
    not: "What does a NAND gate output when both of its inputs carry the same signal? Compare the 00 and 11 rows.",
    and: "NAND gives the opposite of AND, so you are one inversion away.",
    or: "De Morgan's law gives A OR B = NOT(NOT A AND NOT B).",
    nand: "The available NAND gate already computes this function. Match A and B to its inputs.",
    nor: "NOR is the inverse of OR, and De Morgan's law gives you OR from NAND gates.",
    xor: "Reuse A NAND B as the 'not both' condition. It separates the two unequal-input cases from 00 and 11.",
    xnor: "Equality is the inverse of XOR.",
  },
  nor: {
    not: "What does a NOR gate output when both of its inputs carry the same signal? Compare the 00 and 11 rows.",
    and: "De Morgan's law gives A AND B = NOT(NOT A OR NOT B).",
    or: "NOR gives the opposite of OR, so you are one inversion away.",
    nand: "NAND is the inverse of AND, and De Morgan's law gives you AND from NOR gates.",
    nor: "The available NOR gate already computes this function. Match A and B to its inputs.",
    xor: "Reuse A NOR B to isolate the A-only and B-only cases. Their NOR detects equality; a final NOR can invert that result to produce XOR.",
    xnor: "Reuse A NOR B to isolate the A-only and B-only cases. A signal that is 1 for equal inputs is what you want.",
  },
};

/** One plain sentence per construction: the idea of the wiring, not its connection list. */
const LAST_HINTS: Record<PrimitiveFamily, Record<LogicGate, string>> = {
  nand: {
    not: "Feed A into both NAND inputs, so the gate only ever sees two equal bits and flips them.",
    and: "Take the NAND of A and B, then flip the result with a second NAND that has its inputs tied together.",
    or: "Flip A and flip B with a tied NAND each, then NAND the two flipped signals together.",
    nand: "Wire A and B straight into one NAND gate.",
    nor: "Build OR from three NANDs, then flip its output with one more tied NAND.",
    xor: "Start from A NAND B and use it twice, once with each input, so the last NAND is 1 only when A and B differ.",
    xnor: "Build XOR from four NANDs, then flip its output with one more tied NAND.",
  },
  nor: {
    not: "Feed A into both NOR inputs, so the gate only ever sees two equal bits and flips them.",
    and: "Flip A and flip B with a tied NOR each, then NOR the two flipped signals together.",
    or: "Take the NOR of A and B, then flip the result with a second NOR that has its inputs tied together.",
    nand: "Build AND from three NORs, then flip its output with one more tied NOR.",
    nor: "Wire A and B straight into one NOR gate.",
    xor: "Start from A NOR B and use it twice, once with each input, then NOR those two to detect equal inputs and flip that with a tied NOR.",
    xnor: "Start from A NOR B and use it twice, once with each input, so a last NOR of those two is 1 only when A and B match.",
  },
};

/** Requested guidance only: reasoning, size, then the idea of the wiring. */
export function gateConstructionHints(
  family: PrimitiveFamily,
  target: LogicGate,
  { reusableParts = false }: { reusableParts?: boolean } = {},
): LevelHint[] {
  const reference = gateBlueprint(target, family);
  const gates = reference.nodes.filter((node) => node.type === family);
  const primitive = family.toUpperCase();
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
    { title: "Last hint", text: LAST_HINTS[family][target] },
  ];
}

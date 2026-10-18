import { inputCount, isNumberInput, type Node, type NumberInputType, outputCount } from "./logic";
import { isBcdDisplayPackage } from "./sevenSegment";

export type DisplayNode = Node & { displayWidth?: number; displayHeight?: number };

const NUMBER_INPUT_WIDTHS: Record<NumberInputType, number> = { input4: 156, input8: 212, input14: 370 };

export function nodeWidth(node: DisplayNode): number {
  if (node.splice) return 10;
  if (node.displayWidth !== undefined) return node.displayWidth;
  if (isNumberInput(node.type)) return NUMBER_INPUT_WIDTHS[node.type];
  if (node.type === "sevensegment") return 230 + 65 * ((node.digits ?? 1) - 1);
  if (node.type === "module")
    return isBcdDisplayPackage(node.module?.identity?.componentId) ? 550 : 300;
  if (node.type === "display8") return 212;
  if (["display4", "pulse"].includes(node.type)) return 156;
  return 132;
}

export function nodeHeight(node: DisplayNode): number {
  if (node.splice) return 10;
  if (node.displayHeight !== undefined) return node.displayHeight;
  // Raw displays expose one seven-pin place bank at a time.
  if (node.type === "sevensegment") return 344;
  if (node.type === "module")
    return Math.max(
      116,
      92 +
        ((node.inputSide ?? "left") === (node.outputSide ?? "right") &&
        ["left", "right"].includes(node.inputSide ?? "left")
          ? inputCount(node) + outputCount(node)
          : Math.max(inputCount(node), outputCount(node))) *
          25,
    );
  if (
    isNumberInput(node.type) ||
    ["display4", "display8", "merger", "splitter", "bus"].includes(node.type)
  )
    return Math.max(
      node.type.startsWith("display") ? 142 : 116,
      92 + Math.max(inputCount(node), outputCount(node)) * 24,
    );
  if (node.type === "pulse") return 164;
  return ["lamp", "switch"].includes(node.type) ? 126 : 116;
}

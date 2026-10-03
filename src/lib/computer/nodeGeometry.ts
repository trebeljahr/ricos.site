import { inputCount, type Node, outputCount } from "./logic";

export type DisplayNode = Node & { displayWidth?: number; displayHeight?: number };

export const nodeWidth = (node: DisplayNode) =>
  node.displayWidth ??
  (node.type === "module"
    ? 300
    : ["input8", "display8"].includes(node.type)
      ? 212
      : ["input4", "display4"].includes(node.type)
        ? 156
        : 132);

export const nodeHeight = (node: DisplayNode) =>
  node.displayHeight ??
  (node.type === "module"
    ? Math.max(
        116,
        92 +
          ((node.inputSide ?? "left") === (node.outputSide ?? "right") &&
          ["left", "right"].includes(node.inputSide ?? "left")
            ? inputCount(node) + outputCount(node)
            : Math.max(inputCount(node), outputCount(node))) *
            25,
      )
    : ["input4", "input8", "display4", "display8"].includes(node.type)
      ? Math.max(
          node.type.startsWith("display") ? 142 : 116,
          92 + Math.max(inputCount(node), outputCount(node)) * 24,
        )
      : ["lamp", "switch", "pulse"].includes(node.type)
        ? 126
        : 116);

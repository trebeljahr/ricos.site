import { inputCount, type Node, outputCount } from "./logic";

export type DisplayNode = Node & { displayWidth?: number; displayHeight?: number };

export function nodeWidth(node: DisplayNode): number {
  if (node.splice) return 10;
  if (node.displayWidth !== undefined) return node.displayWidth;
  if (node.type === "input14") return 370;
  if (node.type === "sevensegment") return 230 + 65 * ((node.digits ?? 1) - 1);
  if (node.type === "module")
    return node.module?.identity?.componentId.startsWith("bcd-display-package-") ? 550 : 300;
  if (["input8", "display8"].includes(node.type)) return 212;
  if (["input4", "display4", "pulse"].includes(node.type)) return 156;
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
    ["input4", "input8", "input14", "display4", "display8", "merger", "splitter", "bus"].includes(
      node.type,
    )
  )
    return Math.max(
      node.type.startsWith("display") ? 142 : 116,
      92 + Math.max(inputCount(node), outputCount(node)) * 24,
    );
  if (node.type === "pulse") return 164;
  return ["lamp", "switch"].includes(node.type) ? 126 : 116;
}

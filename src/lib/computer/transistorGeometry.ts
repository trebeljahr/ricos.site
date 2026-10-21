import type { Node } from "./logic";

export function isMosfet(node: Pick<Node, "type">) {
  return node.type === "nmos" || node.type === "pmos";
}

/** Gate at the side, source toward its supply rail, drain toward the output. */
export function transistorPortSide(node: Node, index: number, kind: "input" | "output") {
  const sides = ["left", "top", "right", "bottom"] as const;
  const turns = sides.indexOf(node.inputSide ?? "left");
  const base =
    kind === "input" && index === 0 ? 0 : (kind === "input") === (node.type === "pmos") ? 1 : 3;
  return sides[(base + turns) % 4];
}

export function transistorPortPoint(
  node: Node & { displayWidth?: number; displayHeight?: number },
  index: number,
  kind: "input" | "output",
) {
  let x = kind === "input" && index === 0 ? 0 : 2 / 3;
  let y =
    kind === "input" && index === 0 ? 0.5 : (kind === "input") === (node.type === "pmos") ? 0 : 1;
  const turns = ["left", "top", "right", "bottom"].indexOf(node.inputSide ?? "left");
  for (let turn = 0; turn < turns; turn++) [x, y] = [1 - y, x];
  return {
    x: node.x + x * (node.displayWidth ?? 132),
    y: node.y + y * (node.displayHeight ?? 132),
  };
}

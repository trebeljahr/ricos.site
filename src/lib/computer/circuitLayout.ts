import type { Circuit, Node } from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";

const layouts = new WeakMap<Circuit, Circuit>();

function arrangeMemoryBanks(circuit: Circuit, nodes: Node[]) {
  if (!/^4 × 4 (SRAM|DRAM|flash memory)$/.test(circuit.name)) return circuit.groups;
  const bankWidth = circuit.name.includes("flash") ? 2200 : 1800;
  const banks: string[][] = [[], [], [], []];
  for (const node of nodes) {
    const row =
      /(?:row|select)(\d)$/.exec(node.id)?.[1] ??
      /^not-write-(\d)$/.exec(node.id)?.[1] ??
      /-(\d)-\d$/.exec(node.id)?.[1];
    if (row !== undefined) {
      const bank = Number(row);
      banks[bank].push(node.id);
      node.x += 500 + (bank % 2) * bankWidth;
      node.y += 500 + Math.floor(bank / 2) * 1200 - (570 + bank * 790);
    } else if (/^(pair[01]-|selected-|enabled-|q\d)/.test(node.id)) {
      node.x += 500 + bankWidth;
      // Both pairs share the output reduction area beside the bank grid.
      if (node.id.startsWith("pair1-")) node.y -= 1580 - 700;
    }
  }
  return [
    ...(circuit.groups ?? []),
    ...banks.map((nodeIds, bank) => ({
      id: `memory-bank-${bank}`,
      label: `ROW ${bank}`,
      nodeIds,
    })),
  ];
}

// Carry and shift chains read in bit order across the page. Keep the node array
// untouched: its order defines the external interface of a packaged circuit.
function arrangeBitChain(circuit: Circuit, nodes: Node[]) {
  const arithmetic = ["8-bit full adder", "8-bit ALU"].includes(circuit.name);
  const shift = circuit.name === "8-bit shift register";
  const counter = circuit.name === "8-bit binary counter";
  if (!arithmetic && !shift && !counter) return;
  for (const node of nodes) {
    const bit = /^(?:a|b|bit|out|xor|carry)(\d)$/.exec(node.id)?.[1];
    if (bit !== undefined) {
      const x = 360 + Number(bit) * (arithmetic ? 440 : counter ? 480 : 240);
      if (arithmetic) {
        node.x = x;
        node.y = node.id.startsWith("a")
          ? 220
          : node.id.startsWith("b")
            ? 410
            : node.id.startsWith("bit")
              ? 620
              : 980;
      } else if (shift) {
        node.x = x;
        node.y = node.id.startsWith("bit") ? 260 : 500;
      } else {
        node.x = x + (node.id.startsWith("carry") ? 220 : 0);
        node.y = node.id.startsWith("xor")
          ? 260
          : node.id.startsWith("bit")
            ? 500
            : node.id.startsWith("carry")
              ? 740
              : 980;
      }
    } else {
      node.x =
        node.id === "cout" ? 360 + 8 * 440 : node.id === "op0" ? 360 : node.id === "op1" ? 800 : 40;
      node.y = node.id === "cout" ? 620 : ["data", "one"].includes(node.id) ? 260 : 40;
    }
  }
}

/** Prepare built-in diagrams once; never reflow a user's saved or edited canvas. */
export function layoutCircuit(circuit: Circuit): Circuit {
  const cached = layouts.get(circuit);
  if (cached) return cached;
  const nodes = circuit.nodes.map((node) => ({
    ...node,
    ...(node.module ? { module: layoutCircuit(node.module) } : {}),
  }));
  arrangeBitChain(circuit, nodes);
  const groups = arrangeMemoryBanks(circuit, nodes);

  // Preserve authored columns and shared row alignments, expanding their gaps
  // against the same dimensions used by the renderer (including module ports).
  const columns = [...new Set(nodes.map((node) => node.x))].sort((a, b) => a - b);
  const rows = [...new Set(nodes.map((node) => node.y))].sort((a, b) => a - b);
  const xPositions = new Map<number, number>();
  const predecessors = new Map<Node, Node>();
  let x = 80;
  for (const column of columns) {
    const members = nodes.filter((node) => node.x === column).sort((a, b) => a.y - b.y);
    xPositions.set(column, x);
    x += Math.max(...members.map(nodeWidth)) + 100;
    members.forEach((node, index) => {
      if (index > 0) predecessors.set(node, members[index - 1]);
    });
  }
  const yPositions = new Map<Node, number>();
  let previousRow = rows[0] ?? 0;
  let y = 80;
  for (const row of rows) {
    y += row - previousRow;
    const members = nodes.filter((node) => node.y === row);
    for (const node of members) {
      const before = predecessors.get(node);
      if (before && before.y !== row)
        y = Math.max(y, yPositions.get(before)! + nodeHeight(before) + 64);
    }
    // Handle authored stacks at identical coordinates as well.
    for (const node of members) {
      const before = predecessors.get(node);
      yPositions.set(
        node,
        Math.max(
          y,
          before && before.y === row ? yPositions.get(before)! + nodeHeight(before) + 64 : y,
        ),
      );
    }
    previousRow = row;
  }
  const result = {
    ...circuit,
    groups,
    nodes: nodes.map((node) => ({ ...node, x: xPositions.get(node.x)!, y: yPositions.get(node)! })),
  };
  layouts.set(circuit, result);
  return result;
}

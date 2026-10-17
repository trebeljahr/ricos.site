import { type Circuit, GATE_NAMES, type LogicGate, type Node, type Wire } from "./logic";

function dffCircuit(resettable = false): Circuit {
  const names = [
    "data",
    "clock",
    "not-data",
    "not-clock",
    "master-set",
    "master-reset",
    "master-q",
    "master-qbar",
    "slave-set",
    "slave-reset",
    "q",
    "qbar",
    "out",
  ];
  const types = [
    "switch",
    "switch",
    "not",
    "not",
    "nand",
    "nand",
    "nand",
    "nand",
    "nand",
    "nand",
    "nand",
    "nand",
    "lamp",
  ] as const;
  const nodes: Node[] = names.map((id, index) => ({
    id,
    type: types[index],
    x: 0,
    y: 0,
    label: id.replaceAll("-", " ").toUpperCase(),
  }));
  const positions: Record<string, [number, number]> = {
    data: [40, 80], clock: [40, 520],
    "not-data": [280, 300], "not-clock": [280, 520],
    "master-set": [520, 80], "master-reset": [520, 300],
    "master-q": [760, 80], "master-qbar": [760, 300],
    "slave-set": [1000, 80], "slave-reset": [1000, 300],
    q: [1240, 80], qbar: [1240, 300], out: [1480, 80],
  };
  for (const node of nodes) [node.x, node.y] = positions[node.id];
  const wires: Wire[] = [];
  const link = (from: string, to: string, input = 0) =>
    wires.push({
      id: `${from}-${to}-${input}`,
      from,
      to,
      input,
    });
  link("data", "not-data");
  link("clock", "not-clock");
  link("data", "master-set");
  link("not-clock", "master-set", 1);
  link("not-data", "master-reset");
  link("not-clock", "master-reset", 1);
  link("master-set", "master-q");
  link("master-qbar", "master-q", 1);
  link("master-reset", "master-qbar");
  link("master-q", "master-qbar", 1);
  link("master-q", "slave-set");
  link("clock", "slave-set", 1);
  link("master-qbar", "slave-reset");
  link("clock", "slave-reset", 1);
  link("slave-set", "q");
  link("qbar", "q", 1);
  link("slave-reset", "qbar");
  link("q", "qbar", 1);
  link("q", "out");
  if (resettable) {
    nodes.push({ id: "reset", type: "switch", x: 40, y: 740, label: "RESET" },
      { id: "not-reset", type: "not", x: 280, y: 740, label: "NOT RESET" });
    link("reset", "not-reset");
    for (const [prefix, x] of [["master", 520], ["slave", 1000]] as const) {
      const setTarget = prefix === "master" ? "master-q" : "q";
      const resetTarget = prefix === "master" ? "master-qbar" : "qbar";
      for (const [signal, target, type, control, y] of [
        [`${prefix}-set`, setTarget, "or", "reset", 520],
        [`${prefix}-reset`, resetTarget, "and", "not-reset", 740],
      ] as const) {
        const safe = `${signal}-safe`;
        nodes.push({ id: safe, type, x, y, label: `RESET PRIORITY ${type.toUpperCase()}` });
        const index = wires.findIndex(w => w.from === signal && w.to === target && w.input === 0);
        wires.splice(index, 1);
        link(signal, safe); link(control, safe, 1); link(safe, target);
      }
    }
  }
  return { name: resettable ? "D flip-flop with asynchronous reset" : "Positive-edge master-slave D flip-flop", nodes, wires };
}

function srLatchCircuit(): Circuit {
  const nodes: Node[] = [
    { id: "set", type: "switch", x: 30, y: 70, label: "SET" },
    { id: "reset", type: "switch", x: 30, y: 210, label: "RESET" },
    { id: "q", type: "nor", x: 260, y: 70, label: "Q NOR" },
    { id: "qbar", type: "nor", x: 260, y: 210, label: "NOT Q NOR" },
    { id: "out", type: "lamp", x: 500, y: 70, label: "Q" },
  ];
  const wires: Wire[] = [
    { id: "reset-q", from: "reset", to: "q", input: 0 },
    { id: "qbar-q", from: "qbar", to: "q", input: 1 },
    { id: "set-qbar", from: "set", to: "qbar", input: 0 },
    { id: "q-qbar", from: "q", to: "qbar", input: 1 },
    { id: "q-out", from: "q", to: "out", input: 0 },
  ];
  return { name: "Cross-coupled NOR SR latch", nodes, wires };
}

function dLatchCircuit(): Circuit {
  const nodes: Node[] = [
    { id: "data", type: "switch", x: 30, y: 70, label: "DATA" },
    { id: "enable", type: "switch", x: 30, y: 210, label: "ENABLE" },
    { id: "not-data", type: "not", x: 240, y: 170, label: "NOT DATA" },
    { id: "set", type: "and", x: 450, y: 70, label: "SET PATH" },
    { id: "reset", type: "and", x: 450, y: 210, label: "RESET PATH" },
    { id: "core", type: "srlatch", x: 680, y: 110, label: "SR CORE" },
    { id: "out", type: "lamp", x: 920, y: 110, label: "Q" },
  ];
  const wires: Wire[] = [
    { id: "data-not", from: "data", to: "not-data", input: 0 },
    { id: "data-set", from: "data", to: "set", input: 0 },
    { id: "enable-set", from: "enable", to: "set", input: 1 },
    { id: "not-reset", from: "not-data", to: "reset", input: 0 },
    { id: "enable-reset", from: "enable", to: "reset", input: 1 },
    { id: "set-core", from: "set", to: "core", input: 0 },
    { id: "reset-core", from: "reset", to: "core", input: 1 },
    { id: "core-out", from: "core", to: "out", input: 0 },
  ];
  return { name: "Gated D latch", nodes, wires };
}

export const storageCircuit = (type: "dff" | "srlatch" | "dlatch") =>
  type === "dff" ? dffCircuit() : type === "srlatch" ? srLatchCircuit() : dLatchCircuit();

export const storageNodeCircuit = (node: Node) => node.type === "dff" ? dffCircuit(node.resettable) : storageCircuit(node.type as "srlatch" | "dlatch");

export function collectUnfoldableIds(circuit: Circuit, prefix = ""): string[] {
  return circuit.nodes.flatMap((item) => {
    const id = `${prefix}${item.id}`;
    if (item.type === "module" && item.module)
      return [id, ...collectUnfoldableIds(item.module, `${id}/`)];
    if (["dff", "srlatch", "dlatch"].includes(item.type)) {
      if (item.type === "dff" && item.label?.startsWith("FLOATING GATE")) return [id];
      return [
        id,
        ...collectUnfoldableIds(
          storageNodeCircuit(item),
          `${id}/`,
        ),
      ];
    }
    return GATE_NAMES.includes(item.type as LogicGate) || item.type === "dramcell" ? [id] : [];
  });
}

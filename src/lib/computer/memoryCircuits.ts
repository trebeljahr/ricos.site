import type { Circuit, GateType, Node, Wire } from "./logic";

type MemoryKind = "sram" | "dram" | "flash";

class CircuitBuilder {
  readonly nodes: Node[] = [];
  readonly wires: Wire[] = [];

  add(id: string, type: GateType, x: number, y: number, label?: string): string {
    this.nodes.push({ id, type, x, y, label });
    return id;
  }

  connect(from: string, to: string, input = 0): void {
    this.wires.push({ id: `${from}-${to}-${input}`, from, to, input });
  }

  gate(id: string, type: GateType, x: number, y: number, a: string, b: string): string {
    this.add(id, type, x, y);
    this.connect(a, id);
    this.connect(b, id, 1);
    return id;
  }

  circuit(name: string): Circuit {
    return { name, nodes: this.nodes, wires: this.wires };
  }
}

function parallelRegister(): Circuit {
  const builder = new CircuitBuilder();
  builder.add("clock", "clock", 30, 20, "CLOCK");
  builder.add("load", "switch", 30, 110, "LOAD");
  for (let bit = 0; bit < 8; bit++) {
    const y = 250 + bit * 170;
    const data = builder.add(`d${bit}`, "switch", 30, y, `D${bit}`);
    const stored = builder.add(`cell${bit}`, "dff", 570, y, `D FLIP-FLOP ${bit}`);
    const keep = builder.gate(`keep${bit}`, "and", 310, y + 65, stored, `not-load`);
    const write = builder.gate(`write${bit}`, "and", 310, y, data, "load");
    const next = builder.gate(`next${bit}`, "or", 440, y, keep, write);
    builder.connect(next, stored);
    builder.connect("clock", stored, 1);
    const output = builder.add(`q${bit}`, "lamp", 800, y, `Q${bit}`);
    builder.connect(stored, output);
  }
  builder.add("not-load", "not", 170, 110, "HOLD");
  builder.connect("load", "not-load");
  return builder.circuit("8-bit parallel register");
}

function memoryArray(kind: MemoryKind): Circuit {
  const builder = new CircuitBuilder();
  const name = kind === "sram" ? "4 × 4 SRAM" : kind === "dram" ? "4 × 4 DRAM" : "4 × 4 flash memory";
  builder.add("a0", "switch", 30, 20, "ADDRESS 0");
  builder.add("a1", "switch", 30, 110, "ADDRESS 1");
  builder.add("read", "switch", 30, 200, "READ ENABLE");
  if (kind !== "sram") builder.add("clock", "clock", 30, 290, "CLOCK");
  if (kind === "flash") {
    builder.add("program", "switch", 30, 380, "PROGRAM 0");
    builder.add("erase", "switch", 30, 470, "ERASE ALL TO 1");
  } else {
    builder.add("write", "switch", 30, 380, "WRITE ENABLE");
    if (kind === "dram") builder.add("refresh", "switch", 30, 470, "REFRESH ROW");
  }
  builder.add("not-a0", "not", 190, 20, "NOT A0");
  builder.add("not-a1", "not", 190, 110, "NOT A1");
  builder.connect("a0", "not-a0");
  builder.connect("a1", "not-a1");
  for (let row = 0; row < 4; row++) {
    const y = 570 + row * 790;
    const select = builder.gate(
      `select${row}`,
      "and",
      370,
      y,
      row & 1 ? "a0" : "not-a0",
      row & 2 ? "a1" : "not-a1",
    );
    const write = kind === "flash"
      ? builder.gate(`program-row${row}`, "and", 540, y, select, "program")
      : builder.gate(`write-row${row}`, "and", 540, y, select, "write");
    const update = kind === "flash"
      ? builder.gate(`update-row${row}`, "or", 710, y, write, "erase")
      : kind === "dram"
        ? builder.gate(`update-row${row}`, "or", 710, y, write,
            builder.gate(`refresh-row${row}`, "and", 540, y + 90, select, "refresh"))
        : write;
    const edge = kind === "sram"
      ? update
      : builder.gate(`edge-row${row}`, "and", 850, y, update, "clock");
    if (kind === "dram") {
      builder.add(`not-write-${row}`, "not", 700, y + 90, "REFRESH MODE");
      builder.connect("write", `not-write-${row}`);
    }
    for (let bit = 0; bit < 4; bit++) {
      const cy = y + 150 + bit * 145;
      const cell = builder.add(`cell-${row}-${bit}`,
        kind === "dram" ? "dramcell" : kind === "sram" ? "dlatch" : "dff", 1200, cy,
        kind === "dram" ? `CAPACITOR ${row}:${bit}` : kind === "flash" ? `FLOATING GATE ${row}:${bit}` : `SRAM LATCH ${row}:${bit}`);
      const data = `d${bit}`;
      let next = data;
      if (kind === "dram") {
        const inputData = builder.gate(`data-${row}-${bit}`, "and", 920, cy, data, "write");
        const refreshData = builder.gate(`refresh-data-${row}-${bit}`, "and", 920, cy + 65, cell, `not-write-${row}`);
        next = builder.gate(`next-${row}-${bit}`, "or", 1070, cy, inputData, refreshData);
      } else if (kind === "flash") {
        // A zero charge means erased (logic 1). Programming stores charge (logic 0).
        next = builder.gate(`program-data-${row}-${bit}`, "and", 1070, cy, write, "not-erase");
      }
      builder.connect(next, cell);
      builder.connect(edge, cell, 1);
      const source = kind === "flash" ? builder.add(`sense-${row}-${bit}`, "not", 1370, cy, "SENSE CHARGE") : cell;
      if (kind === "flash") builder.connect(cell, source);
      builder.gate(`read-${row}-${bit}`, "and", 1540, cy, source, select);
    }
  }
  if (kind === "flash") {
    builder.add("not-erase", "not", 190, 470, "NOT ERASE");
    builder.connect("erase", "not-erase");
  }
  for (let bit = 0; bit < 4; bit++) {
    if (kind !== "flash") builder.add(`d${bit}`, "switch", 30, 700 + bit * 145, `DATA IN ${bit}`);
    const pair0 = builder.gate(`pair0-${bit}`, "or", 1720, 720 + bit * 145,
      `read-0-${bit}`, `read-1-${bit}`);
    const pair1 = builder.gate(`pair1-${bit}`, "or", 1720, 2300 + bit * 145,
      `read-2-${bit}`, `read-3-${bit}`);
    const selected = builder.gate(`selected-${bit}`, "or", 1890, 720 + bit * 145, pair0, pair1);
    const enabled = builder.gate(`enabled-${bit}`, "and", 2060, 720 + bit * 145, selected, "read");
    const output = builder.add(`q${bit}`, "lamp", 2240, 720 + bit * 145, `DATA OUT ${bit}`);
    builder.connect(enabled, output);
  }
  return builder.circuit(name);
}

export const MEMORY_PRESETS: Record<string, Circuit> = {
  "8-bit parallel register": parallelRegister(),
  "4 × 4 SRAM": memoryArray("sram"),
  "4 × 4 DRAM": memoryArray("dram"),
  "4 × 4 flash memory": memoryArray("flash"),
};

export const MEMORY_HINTS: Record<string, string> = {
  "8-bit parallel register": "Set LOAD and data bits, then pulse CLOCK. Clear LOAD to hold the word.",
  "4 × 4 SRAM": "Choose a row with ADDRESS, set DATA bits, and turn on WRITE. The selected row stores data while WRITE is on.",
  "4 × 4 DRAM": "WRITE on a clock edge. REFRESH the selected row before four clock cycles pass or charged bits fade to 0.",
  "4 × 4 flash memory": "PROGRAM sets the selected word to 0. ERASE resets every word to 1. Both act on a clock edge.",
};

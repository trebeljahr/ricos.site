// The memory demos, smallest first: one addressable cell drawn as gates, eight
// of those cells as one addressable byte, then four bytes and a register that
// share one data bus. Every part is placed by hand so each wire runs on its own track.
import { range } from "./blockBuilder";
import type { Circuit, Node, Wire, WireColor, WireLane } from "./logic";

/** Pins of a two-input gate or latch, measured from its top edge. */
const PIN = [40, 92] as const;
const OUT = 58;
/** A switch's output and a lamp's input, from the top edge. */
const SWITCH = 63;
/** Pins of an eight-pin part (number input, merger, splitter, bus), from its top edge. */
const bytePin = (bit: number) => 40 + (bit * 220) / 7;
const BYTE_HEIGHT = 284;
const PART = 132;

function board() {
  const nodes: Node[] = [];
  const wires: Wire[] = [];
  const add = (
    id: string,
    type: Node["type"],
    x: number,
    y: number,
    label?: string,
    extra: Partial<Node> = {},
  ) => {
    nodes.push({ id, type, x, y, ...(label ? { label } : {}), ...extra });
    return id;
  };
  const link = (
    from: string | [string, number],
    to: string,
    input: number,
    color: WireColor,
    extra: Partial<Wire> = {},
  ) => {
    const [id, output] = typeof from === "string" ? [from, undefined] : from;
    wires.push({
      id: `${id}:${output ?? 0}>${to}:${input}`,
      from: id,
      to,
      input,
      ...(output === undefined ? {} : { output }),
      color,
      ...extra,
    });
  };
  return { nodes, wires, add, link };
}

/**
 * Vertical runs for wires that fan between pins at different heights. Wires going
 * down nest from the top and wires going up from the bottom, so none of them cross.
 */
function fanTracks(from: number[], to: number[], first: number, step: number) {
  const down = from.map((y, i) => to[i] > y);
  return from.map((_, i) => {
    const rank = down[i]
      ? from.filter((_, j) => j < i && down[j]).length
      : from.filter((_, j) => j > i && !down[j]).length;
    return first + rank * step;
  });
}

/**
 * One memory cell, unfolded to gates: a D latch made of a NOT, two ANDs and two
 * cross-coupled NORs. SELECT stands for the address decoder's line to this cell;
 * with WRITE it opens the latch, with READ it lets the stored bit out.
 */
export function memoryCellDemo(): Circuit {
  const { nodes, wires, add, link } = board();
  // RESET PATH on top feeds the Q NOR; SET PATH below feeds the NOT Q NOR.
  const reset = 0;
  const set = 300;
  const writeGate = (reset + PIN[1] + set + PIN[0]) / 2 - OUT;
  const readGate = 441;
  const selectOut = 363;
  add("data", "switch", 0, reset + PIN[0] - SWITCH, "DATA IN", { value: true });
  add("write", "switch", 0, writeGate + PIN[0] - SWITCH, "WRITE");
  add("select", "switch", 0, selectOut - SWITCH, "SELECT");
  add("read", "switch", 0, readGate + PIN[1] - SWITCH, "READ");
  add("write-here", "and", 240, writeGate, "WRITE CELL");
  add("read-here", "and", 240, readGate, "READ CELL");
  add("not-data", "not", 480, reset + PIN[0] - OUT, "NOT DATA");
  add("reset", "and", 700, reset, "RESET PATH");
  add("set", "and", 700, set, "SET PATH");
  const q = reset + OUT - PIN[0];
  const qBar = set + OUT - PIN[1];
  // NOT Q settles first, so the cell starts out holding 0.
  add("q-bar", "nor", 940, qBar, "NOT Q NOR");
  add("q", "nor", 940, q, "Q NOR");
  add("stored", "lamp", 1200, q + OUT - SWITCH, "STORED");
  const outGate = readGate + OUT - PIN[1];
  add("out-gate", "and", 1200, outGate, "OUTPUT GATE");
  add("out", "lamp", 1420, outGate + OUT - SWITCH, "DATA OUT");

  link("data", "not-data", 0, "cyan");
  link("data", "set", 1, "cyan", { runBeforeEnd: 260 });
  link("not-data", "reset", 0, "blue");
  link("write", "write-here", 0, "amber");
  link("select", "write-here", 1, "violet", { runBeforeEnd: 40 });
  link("select", "read-here", 0, "violet", { runBeforeEnd: 40 });
  link("read", "read-here", 1, "coral");
  link("write-here", "reset", 1, "amber", { runBeforeEnd: 40 });
  link("write-here", "set", 0, "amber", { runBeforeEnd: 40 });
  link("reset", "q", 0, "lime");
  link("set", "q-bar", 1, "lime");
  // The two NORs feed each other through the gap between them; the wires cross once.
  const right = 940 + PART;
  const gapTop = q + 116 + 40;
  const gapBottom = qBar - 40;
  link("q", "q-bar", 0, "lime", {
    points: [
      { x: right, y: q + OUT },
      { x: right + 20, y: q + OUT },
      { x: right + 20, y: gapTop },
      { x: 910, y: gapTop },
      { x: 910, y: qBar + PIN[0] },
      { x: 940, y: qBar + PIN[0] },
    ],
  });
  link("q-bar", "q", 1, "blue", {
    points: [
      { x: right, y: qBar + OUT },
      { x: right + 40, y: qBar + OUT },
      { x: right + 40, y: gapBottom },
      { x: 890, y: gapBottom },
      { x: 890, y: q + PIN[1] },
      { x: 940, y: q + PIN[1] },
    ],
  });
  link("q", "stored", 0, "lime");
  link("q", "out-gate", 0, "lime", { runBeforeEnd: 30 });
  link("read-here", "out-gate", 1, "coral");
  link("out-gate", "out", 0, "lime");
  return { name: "One memory cell", nodes, wires };
}

/** Eight D latches in a column, one per bit. */
const LATCH_STEP = 150;
const latchY = (bit: number) => bit * LATCH_STEP;

/**
 * Eight cells that share one SELECT: one byte. DATA IN is written into all eight
 * at once; on a read, one tri-state driver puts all eight bits on the data bus.
 */
export function memoryByteDemo(): Circuit {
  const { nodes, wires, add, link } = board();
  const latchX = 760;
  const bits = range(8);
  const dPins = bits.map((bit) => latchY(bit) + PIN[0]);
  const qPins = bits.map((bit) => latchY(bit) + OUT);
  const middle = (dPins[0] + dPins[7]) / 2;
  const inputY = Math.round(middle - (bytePin(0) + bytePin(7)) / 2);
  const writeGate = -180;
  const readGate = latchY(7) + 220;
  add("write", "switch", 0, writeGate + PIN[0] - SWITCH, "WRITE");
  add("select", "switch", 0, Math.round(middle) - SWITCH, "SELECT");
  add("read", "switch", 0, readGate + PIN[1] - SWITCH, "READ");
  add("data", "input8", 280, inputY, "DATA IN", { numberValue: 0x2a });
  add("write-here", "and", 280, writeGate, "WRITE BYTE");
  add("read-here", "and", 280, readGate, "READ BYTE");
  link("write", "write-here", 0, "amber");
  link("select", "write-here", 1, "violet", { runBeforeEnd: 40 });
  link("select", "read-here", 0, "violet", { runBeforeEnd: 40 });
  link("read", "read-here", 1, "coral");

  const dataTracks = fanTracks(
    bits.map((bit) => inputY + bytePin(bit)),
    dPins,
    60,
    22,
  );
  const mergerX = latchX + PART + 160;
  const mergerY = Math.round((qPins[0] + qPins[7]) / 2 - (bytePin(0) + bytePin(7)) / 2);
  const qTracks = fanTracks(
    qPins,
    bits.map((bit) => mergerY + bytePin(bit)),
    40,
    22,
  );
  for (const bit of bits) {
    add(`cell${bit}`, "dlatch", latchX, latchY(bit), `BIT ${bit}`);
    link(["data", bit], `cell${bit}`, 0, "cyan", { runBeforeEnd: dataTracks[bit] });
    link("write-here", `cell${bit}`, 1, "amber", { runBeforeEnd: 30 });
    link(`cell${bit}`, "lanes", bit, "lime", { runBeforeEnd: qTracks[bit] });
  }
  add("lanes", "merger", mergerX, mergerY, "STORED BITS");
  const driverX = mergerX + PART + 120;
  const driverY = mergerY + BYTE_HEIGHT / 2 - PIN[0];
  add("driver", "busdriver", driverX, driverY, "TRI-STATE DRIVER");
  link("lanes", "driver", 0, "lime");
  link("read-here", "driver", 1, "coral", { runBeforeEnd: 30 });
  add("bus", "bus", driverX + PART + 120, driverY + OUT - bytePin(0), "DATA BUS");
  link("driver", "bus", 0, "lime");
  return { name: "One addressable byte", nodes, wires };
}

/** A byte as a block: eight D latches that share one WRITE line. The RAM and its register use it. */
function byteBlock(name: string, write: string): Circuit {
  const { nodes, wires, add, link } = board();
  for (const bit of range(8)) {
    add(`d${bit}`, "switch", 0, latchY(bit) + PIN[0] - SWITCH, `D${bit}`);
    add(`cell${bit}`, "dlatch", 360, latchY(bit), `BIT ${bit}`);
    add(`q${bit}`, "lamp", 600, latchY(bit) + OUT - SWITCH, `Q${bit}`);
    link(`d${bit}`, `cell${bit}`, 0, "cyan");
    link("write", `cell${bit}`, 1, "amber", { runBeforeEnd: 30 });
    link(`cell${bit}`, `q${bit}`, 0, "lime");
  }
  add("write", "switch", 0, latchY(8), write);
  return {
    name,
    nodes,
    wires,
    ports: {
      inputs: [...range(8).map((bit) => `d${bit}`), "write"],
      outputs: range(8).map((bit) => `q${bit}`),
    },
  };
}

export const RAM_BYTES = 4;
/** A folded byte block: nine inputs and eight outputs. */
const BLOCK_HEIGHT = 92 + 9 * 25;
const BLOCK_WIDTH = 300;
const blockInput = (pin: number) => 42 + (pin * (BLOCK_HEIGHT - 66)) / 8;
const blockOutput = (pin: number) => 42 + (pin * (BLOCK_HEIGHT - 66)) / 7;

/**
 * Four bytes of RAM and a register on one data bus. A0 and A1 pick one byte
 * through a decoder. WRITE stores the bus in the picked byte; READ lets the
 * picked byte drive the bus through its tri-state driver. DATA IN and the
 * register have drivers of their own, so a byte can travel from one address to
 * another in two bus cycles: read into the register, then write from it.
 */
export function smallRamDemo(): Circuit {
  const { nodes, wires, add, link } = board();
  const rowStep = BLOCK_HEIGHT + 220;
  /** Rows from the top: DATA IN, then the four bytes. The register sits below them. */
  const rowY = (row: number) => 700 + row * rowStep;
  const lastByte = rowY(RAM_BYTES);
  const registerY = rowY(RAM_BYTES) + 620;
  const strobeX = 560;
  const pulseX = 740;
  const selectX = 600;
  const gateX = 1000;
  const trunkX = 1240;
  const blockX = 1320;
  const mergerX = blockX + BLOCK_WIDTH + 160;
  const driverX = mergerX + PART + 120;
  const busX = driverX + PART + 260;
  const splitX = busX + PART + 120;

  // The decoder, as on its own page: A0, NOT A0, A1 and NOT A1 each run down a rail.
  add("a0", "switch", 0, 0, "A0");
  add("not-a0", "not", 200, 130, "NOT A0");
  add("a1", "switch", 0, 300, "A1");
  add("not-a1", "not", 200, 430, "NOT A1");
  link("a0", "not-a0", 0, "cyan", { runBeforeEnd: 30 });
  link("a1", "not-a1", 0, "amber", { runBeforeEnd: 30 });
  const rail = { "not-a0": 220, "not-a1": 170, a1: 120, a0: 70 } as const;
  const railColor = { a0: "cyan", "not-a0": "blue", a1: "amber", "not-a1": "coral" } as const;
  add("read", "switch", strobeX, 0, "READ");

  // Stores happen on a clock pulse: WRITE and LOAD pick where the pulse stores the bus.
  const writePulse = lastByte + 203;
  add("write", "switch", strobeX, writePulse + PIN[0] - SWITCH, "WRITE");
  add("write-pulse", "and", pulseX, writePulse, "WRITE PULSE");
  add("clock", "clock", strobeX, writePulse + 157, "CLOCK");
  link("write", "write-pulse", 0, "amber");
  link("clock", "write-pulse", 1, "violet", { runBeforeEnd: 40 });

  const lanes: WireLane[] = [];
  const driven: string[] = [];

  /** A storage block with its merger and tri-state driver; returns the y of its WRITE pin. */
  const storageRow = (y: number, id: string, label: string, circuit: Circuit) => {
    nodes.push({ id, type: "module", module: circuit, label, x: blockX, y } satisfies Node);
    const mergerY = Math.round(
      y + (blockOutput(0) + blockOutput(7)) / 2 - (bytePin(0) + bytePin(7)) / 2,
    );
    add(`${id}-lanes`, "merger", mergerX, mergerY, `${label} BITS`);
    const tracks = fanTracks(
      range(8).map((bit) => y + blockOutput(bit)),
      range(8).map((bit) => mergerY + bytePin(bit)),
      40,
      14,
    );
    for (const bit of range(8)) {
      link(["bus-lines", bit], id, bit, "amber");
      link([id, bit], `${id}-lanes`, bit, "lime", { runBeforeEnd: tracks[bit] });
    }
    const driverY = mergerY + BYTE_HEIGHT / 2 - PIN[0];
    add(`${id}-driver`, "busdriver", driverX, driverY, `${label} DRIVER`);
    link(`${id}-lanes`, `${id}-driver`, 0, "lime");
    driven.push(`${id}-driver`);
    return y + blockInput(8);
  };

  // DATA IN: a typed byte, put on the bus by its own driver.
  {
    const y = rowY(0);
    add("data", "input8", blockX, y, "DATA IN", { numberValue: 0x2a });
    add("data-lanes", "merger", mergerX, y, "DATA IN BITS");
    for (const bit of range(8)) link(["data", bit], "data-lanes", bit, "cyan");
    const driverY = y + BYTE_HEIGHT / 2 - PIN[0];
    add("data-driver", "busdriver", driverX, driverY, "DATA IN DRIVER");
    link("data-lanes", "data-driver", 0, "cyan");
    add("send-data", "switch", gateX, y - 150, "SEND DATA IN");
    link("send-data", "data-driver", 1, "coral", { runBeforeEnd: 40 });
    driven.push("data-driver");
  }

  for (const address of range(RAM_BYTES)) {
    const y = rowY(address + 1);
    const id = `byte${address}`;
    const writePin = storageRow(y, id, `BYTE ${address}`, byteBlock("Byte", "WRITE"));
    const select = add(`select${address}`, "and", selectX, y, `SELECT ${address}`);
    const low = address & 1 ? "a0" : "not-a0";
    const high = address & 2 ? "a1" : "not-a1";
    link(low, select, 0, railColor[low], { runBeforeEnd: rail[low] });
    link(high, select, 1, railColor[high], { runBeforeEnd: rail[high] });
    // READ's line runs above the block to its driver.
    add(`read${address}`, "and", gateX, y - 110, `READ ${address}`);
    add(`write${address}`, "and", gateX, writePin - OUT, `WRITE ${address}`);
    link(select, `read${address}`, 0, "violet", { runBeforeEnd: 40 });
    link("read", `read${address}`, 1, "coral", { runBeforeEnd: 100 });
    link(select, `write${address}`, 0, "violet", { runBeforeEnd: 40 });
    link("write-pulse", `write${address}`, 1, "amber", { runBeforeEnd: 80 });
    link(`write${address}`, id, 8, "amber");
    link(`read${address}`, `${id}-driver`, 1, "coral", { runBeforeEnd: 40 });
  }

  // The register: a clock pulse with LOAD on stores the bus; SEND REGISTER puts it back on.
  {
    const writePin = storageRow(registerY, "register", "REGISTER", byteBlock("Register", "LOAD"));
    const loadPulse = writePin - OUT;
    add("load", "switch", strobeX, loadPulse + PIN[1] - SWITCH, "LOAD REGISTER");
    add("load-pulse", "and", gateX, loadPulse, "LOAD PULSE");
    link("clock", "load-pulse", 0, "violet", { runBeforeEnd: 40 });
    link("load", "load-pulse", 1, "amber");
    link("load-pulse", "register", 8, "amber");
    add("send-register", "switch", gateX, registerY - 110, "SEND REGISTER");
    link("send-register", "register-driver", 1, "coral", { runBeforeEnd: 40 });
  }

  // Each driver feeds one pin of the bus. The bus's lines run back to every block.
  const busY = Math.round((rowY(0) + registerY + BLOCK_HEIGHT) / 2 - BYTE_HEIGHT / 2);
  add("bus", "bus", busX, busY, "DATA BUS");
  const busTracks = fanTracks(
    driven.map((driver) => (nodes.find((node) => node.id === driver)?.y ?? 0) + OUT),
    driven.map((_, pin) => busY + bytePin(pin)),
    40,
    22,
  );
  driven.forEach((driver, pin) => {
    link(driver, "bus", pin, "lime", { runBeforeEnd: busTracks[pin] });
  });
  add("bus-lines", "splitter", splitX, busY, "BUS LINES");
  link("bus", "bus-lines", 0, "amber");
  lanes.push({
    id: "bus",
    label: "DATA BUS",
    sources: range(8).map((bit) => ({ node: "bus-lines", output: bit })),
    bus: "bus",
    trunkX: [trunkX],
    via: [{ x: splitX + PART + 60, y: rowY(0) - 220 }],
    color: "amber",
  });
  return { name: "Four bytes on a data bus", nodes, wires, lanes };
}

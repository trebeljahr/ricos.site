// Chapter demos use the same circuits as the editor, tutorials and CPU.
import { Builder, type Ref, range } from "./blockBuilder";
import { layoutCircuit } from "./circuitLayout";
import { addDataMemory, datapathNode } from "./datapathBlocks";
import { type Circuit, gateBlueprint, type LogicGate, PRESETS, type Wire } from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";
import { CATALOG } from "./tutorial/levels";

function builtIn(id: string): Circuit {
  const circuit = CATALOG.builtInModule(id);
  if (!circuit) throw new Error(`Unknown circuit part: ${id}`);
  return circuit;
}

function boxedFullAdder(): Circuit {
  const circuit = PRESETS["8-bit full adder"].nodes.find((node) => node.type === "module")?.module;
  if (!circuit) throw new Error("The byte adder needs its full-adder module");
  return circuit;
}

const ROW = 210;
/** Full adder ports, with the carry on top so the chain never crosses A and B. */
const FULL_ADDER_INPUTS = ["cin", "a", "b"];
const SUM_PIN = 42;
const A_PIN = 92;
const LAST_PIN = 143;
/** Keeps an input's output lines off the levels of the adder pins, where they would read as one wire. */
const PIN_CLEARANCE = 24;
/** How far left of a lamp its wire leaves the line running past it. */
const LAMP_TAP = 22;
const LAMP_CLEARANCE = 20;
const DISPLAY_TRACK = 20;
const FIRST_OUTPUT = 40;
const DISPLAY_MARGIN = 30;

/**
 * A column of full adders, bit 0 on top, each passing its carry down to the next.
 * A sits at the top and B at the bottom. Each bit has its own wire on its own
 * vertical track, ordered so the wires from one input never cross each other.
 */
function columnAdderDemo(width: 4 | 8, a: number, b: number): Circuit {
  const adder = layoutCircuit(boxedFullAdder());
  const bits = range(width);
  const names: Record<string, (bit: number) => string> = {
    a: (bit) => `A${bit}`,
    b: (bit) => `B${bit}`,
    sum: (bit) => `SUM${bit}`,
  };
  // Each adder's pins carry the same names as the wires reaching them.
  const stage = (bit: number): Circuit => ({
    ...adder,
    ports: { inputs: FULL_ADDER_INPUTS, outputs: ["sum", "carry"] },
    nodes: adder.nodes.map((node) =>
      names[node.id] ? { ...node, label: names[node.id](bit) } : node,
    ),
  });
  const input = width === 4 ? "input4" : "input8";
  const part = { id: "a", type: input, x: 0, y: 0 } as const;
  const lastOutput = nodeHeight(part) - 24;
  const track = width === 4 ? 20 : 18;
  const firstTrack = 40;
  const adderX = nodeWidth(part) + firstTrack + 2 * width * track + firstTrack;
  const lampX = adderX + 380;
  const rowY = (bit: number) => bit * ROW;
  const sumLine = (bit: number) => rowY(bit) + SUM_PIN;
  const carryLine = rowY(width - 1) + LAST_PIN;
  const lamp = { id: "", type: "lamp", x: 0, y: 0 } as const;
  const display = { id: "total", type: "display8", bits: width + 1, x: 0, y: 0 } as const;
  const displayPin = (pin: number) =>
    FIRST_OUTPUT + (pin * (nodeHeight(display) - FIRST_OUTPUT - 24)) / width;
  const displayY = Math.round((sumLine(0) + carryLine - nodeHeight(display)) / 2);
  const displayX =
    lampX + nodeWidth(lamp) + 2 * DISPLAY_MARGIN + Math.ceil((width + 1) / 2) * DISPLAY_TRACK;
  /** Lines above their pin come down and lines below it go up; each side nests, so they stay apart. */
  const displayRun = (pin: number, line: number) =>
    DISPLAY_MARGIN + (line < displayY + displayPin(pin) ? pin : width - pin) * DISPLAY_TRACK;
  const nodes: Circuit["nodes"] = [
    {
      id: "a",
      type: input,
      label: "A",
      numberValue: a,
      opensToSwitches: "cyan",
      x: 0,
      // Every output of A sits above the first adder's pins, so its wires all run down.
      y: A_PIN - PIN_CLEARANCE - lastOutput,
    },
    {
      id: "b",
      type: input,
      label: "B",
      numberValue: b,
      opensToSwitches: "amber",
      x: 0,
      // Every output of B sits below the last adder's pins, so its wires all run up.
      y: rowY(width - 1) + LAST_PIN + PIN_CLEARANCE - FIRST_OUTPUT,
    },
    ...bits.map((bit) => ({
      id: `bit${bit}`,
      type: "module" as const,
      module: stage(bit),
      label: `FULL ADDER ${bit}`,
      x: adderX,
      y: rowY(bit),
    })),
    // Each sum line runs under its lamp on the way to the display.
    ...bits.map((bit) => ({
      id: `out${bit}`,
      type: "lamp" as const,
      label: `SUM${bit}`,
      x: lampX,
      y: sumLine(bit) - LAMP_CLEARANCE - nodeHeight(lamp),
    })),
    // The carry line runs over its lamp, since the last sum lamp is above it.
    { id: "cout", type: "lamp", label: "CARRY", x: lampX, y: carryLine + LAMP_CLEARANCE },
    {
      id: "total",
      type: "display8",
      bits: width + 1,
      label: "A + B",
      x: displayX,
      y: displayY,
    },
  ];
  const wires: Circuit["wires"] = [];
  const link = (from: string, output: number, to: string, pin: number, extra: Partial<Wire> = {}) =>
    wires.push({ id: `${from}:${output}>${to}:${pin}`, from, output, to, input: pin, ...extra });
  for (const bit of bits) {
    const box = `bit${bit}`;
    // Nearest the adders: A, bit 0 first. Left of those: B, last bit first.
    link("a", bit, box, 1, { color: "cyan", runBeforeEnd: firstTrack + bit * track });
    link("b", bit, box, 2, {
      color: "amber",
      runBeforeEnd: firstTrack + (2 * width - 1 - bit) * track,
    });
    if (bit > 0) link(`bit${bit - 1}`, 1, box, 0, { color: "violet", railBetweenParts: true });
    link(box, 0, `out${bit}`, 0, { color: "lime", runBeforeEnd: LAMP_TAP });
    link(box, 0, "total", bit, { color: "lime", runBeforeEnd: displayRun(bit, sumLine(bit)) });
  }
  const last = `bit${width - 1}`;
  link(last, 1, "cout", 0, { color: "violet", runBeforeEnd: LAMP_TAP });
  link(last, 1, "total", width, { color: "violet", runBeforeEnd: displayRun(width, carryLine) });
  return { name: `${width}-bit adder`, nodes, wires, reflow: "column" };
}

export function adderDemo(
  kind: "sum" | "half" | "full" | "boxed-full" | "nibble" | "byte",
): Circuit {
  if (kind === "nibble") return columnAdderDemo(4, 5, 9);
  if (kind === "byte") return columnAdderDemo(8, 13, 29);
  const base =
    kind === "full"
      ? PRESETS["Full adder"]
      : kind === "boxed-full"
        ? boxedFullAdder()
        : PRESETS["Half adder"];
  const circuit = structuredClone(base);
  if (kind === "sum") {
    circuit.name = "Adding two bits";
    circuit.nodes = circuit.nodes.filter((node) => !["and", "carry"].includes(node.id));
    circuit.wires = circuit.wires.filter((wire) => !["and", "carry"].includes(wire.to));
  }
  circuit.nodes = circuit.nodes.map((node) => ({
    ...node,
    value: node.id === "a" || (kind !== "sum" && node.id === "b"),
  }));
  return layoutCircuit(circuit);
}

/** A primitive gate on the same two-input bench as the lab's NAND example. */
export function gateDemo(gate: LogicGate): Circuit {
  const circuit = structuredClone(PRESETS["NAND gate demo"]);
  circuit.name = `${gate.toUpperCase()} gate`;
  circuit.nodes = circuit.nodes
    .filter((node) => gate !== "not" || node.id !== "b")
    .map((node) =>
      node.id === "gate" ? { ...node, type: gate, label: gate.toUpperCase() } : node,
    );
  circuit.wires = circuit.wires.filter((wire) => gate !== "not" || wire.from !== "b");
  return layoutCircuit(circuit);
}

export const transistorDemo = (gate: LogicGate) => layoutCircuit(gateBlueprint(gate, "transistor"));

export type SwitchLampWiring =
  | "single"
  | "series"
  | "parallel"
  | "not"
  | "nand"
  | "nor"
  | "xor"
  | "xnor";

export const lampGate = (wiring: Exclude<SwitchLampWiring, "single">): LogicGate =>
  wiring === "series" ? "and" : wiring === "parallel" ? "or" : wiring;

/** The lamp and editor use the same complete complementary CMOS network. */
export function transistorLampDemo(
  wiring: SwitchLampWiring,
  kind: "nmos" | "pmos" = "nmos",
): Circuit {
  if (wiring !== "single") return gateBlueprint(lampGate(wiring), "transistor");
  const circuit = switchLampDemo("single");
  return {
    ...circuit,
    nodes: circuit.nodes.map((node) =>
      node.type === "nmos" ? { ...node, type: kind, label: `${kind.toUpperCase()} A` } : node,
    ),
  };
}

type Contact = readonly ["a" | "b", "nmos"];

/** Physical contact analogies: one switch, two in series, or two in parallel. */
export function switchLampDemo(wiring: "single" | "series" | "parallel"): Circuit {
  const a: Contact = ["a", "nmos"];
  const b: Contact = ["b", "nmos"];
  const paths: Record<typeof wiring, Contact[][]> = {
    single: [[a]],
    series: [[a, b]],
    parallel: [[a], [b]],
  };
  const builder = new Builder();
  builder.add("power", "high", 0, 0, "BATTERY");
  builder.add("a", "switch", 0, 160, "CONTROL A");
  if (paths[wiring].some((path) => path.some(([control]) => control === "b")))
    builder.add("b", "switch", 0, 320, "CONTROL B");
  const ends = paths[wiring].map((path, branch) =>
    path.reduce<string>(
      (source, [control, type], position) =>
        builder.gate(
          `path-${branch}-${position}`,
          type,
          200 + position * 180,
          50 + branch * 180,
          control,
          source,
          `${type.toUpperCase()} ${control.toUpperCase()}`,
        ),
      "power",
    ),
  );
  if (ends.length === 2) builder.gate("paths", "junction", 600, 0, ends[0], ends[1]);
  builder.add("lamp", "lamp", 800, 0, "LAMP");
  builder.connect(ends.length === 2 ? "paths" : ends[0], "lamp");
  return builder.circuit("Switches and a lamp");
}

/** The tutorial's selector, with labels matching its Boolean expression. */
export function booleanSelectorDemo(): Circuit {
  const circuit = structuredClone(builtIn("selector"));
  circuit.name = "Boolean selector";
  const labels: Record<string, string> = {
    sel: "S",
    a: "A",
    b: "B",
    out: "Y",
    n1: "NOT S",
    n2: "S̅ · A",
    n3: "S · B",
    n4: "OR",
  };
  circuit.nodes = circuit.nodes.map((node) => ({
    ...node,
    label: labels[node.id] ?? node.label,
    value: node.id === "a",
  }));
  return layoutCircuit(circuit);
}

/** Wires for a hand-placed demo, each with its own colour and vertical track. */
function wiring() {
  const wires: Wire[] = [];
  const link = (from: string, to: string, input: number, extra: Partial<Wire> = {}) =>
    wires.push({ id: `${from}>${to}:${input}`, from, to, input, ...extra });
  return { wires, link };
}

/** Pins of a two-input gate, measured from its top edge. */
const GATE_PIN = [40, 92];
const GATE_OUT = 58;
/** A switch's output and a lamp's input, from the top edge. */
const SWITCH_PIN = 63;

/**
 * Two NOT gates and four AND gates, flat. A0, NOT A0, A1 and NOT A1 each run down
 * their own rail; each AND takes one A0 rail and one A1 rail, so it lights for one address.
 */
function flatDecoder(): Circuit {
  const andY = (line: number) => line * 150;
  const nodes: Circuit["nodes"] = [
    { id: "a0", type: "switch", label: "A0", x: 0, y: 0 },
    { id: "not0", type: "not", label: "NOT A0", x: 200, y: 130 },
    { id: "a1", type: "switch", label: "A1", x: 0, y: 300 },
    { id: "not1", type: "not", label: "NOT A1", x: 200, y: 430 },
    ...range(4).flatMap((line) => [
      { id: `and${line}`, type: "and" as const, x: 600, y: andY(line) },
      {
        id: `y${line}`,
        type: "lamp" as const,
        label: `Y${line}`,
        x: 840,
        y: andY(line) + GATE_OUT - SWITCH_PIN,
      },
    ]),
  ];
  const { wires, link } = wiring();
  // Rails from left to right: NOT A0, NOT A1, A1, A0. This order crosses the fewest wires.
  const rail = { not0: 220, not1: 170, a1: 120, a0: 70 } as const;
  const color = { a0: "cyan", not0: "blue", a1: "amber", not1: "coral" } as const;
  link("a0", "not0", 0, { color: "cyan", runBeforeEnd: 30 });
  link("a1", "not1", 0, { color: "amber", runBeforeEnd: 30 });
  for (const line of range(4)) {
    const low = line & 1 ? "a0" : "not0";
    const high = line & 2 ? "a1" : "not1";
    link(low, `and${line}`, 0, { color: color[low], runBeforeEnd: rail[low] });
    link(high, `and${line}`, 1, { color: color[high], runBeforeEnd: rail[high] });
    link(`and${line}`, `y${line}`, 0, { color: "lime" });
  }
  return { name: "2-to-4 decoder", nodes, wires };
}

/**
 * Four-to-one multiplexer from plain gates, no boxes: A0 picks one signal of each
 * pair, A1 picks between the pairs. Both NOT gates are shared, 11 gates in all.
 */
function flatMultiplexer(): Circuit {
  const pickY = [0, 150, 330, 480];
  const orY = [50, 380];
  // Each pair's AND sits level with its OR's output, so that wire runs straight.
  const passY = orY.map((y) => y + GATE_OUT - GATE_PIN[0]);
  const outY = 250;
  const nodes: Circuit["nodes"] = [
    ...range(4).map((bit) => ({
      id: `d${bit}`,
      type: "switch" as const,
      label: `D${bit}`,
      x: 0,
      y: pickY[bit] + GATE_PIN[0] - SWITCH_PIN,
    })),
    { id: "a0", type: "switch", label: "A0", x: 0, y: 640 },
    { id: "not0", type: "not", label: "NOT A0", x: 220, y: 740 },
    { id: "a1", type: "switch", label: "A1", x: 0, y: 900 },
    { id: "not1", type: "not", label: "NOT A1", x: 220, y: 1000 },
    ...range(4).map((bit) => ({ id: `pick${bit}`, type: "and" as const, x: 560, y: pickY[bit] })),
    { id: "low", type: "or", label: "LOW PAIR", x: 800, y: orY[0] },
    { id: "high", type: "or", label: "HIGH PAIR", x: 800, y: orY[1] },
    { id: "lowPass", type: "and", x: 1040, y: passY[0] },
    { id: "highPass", type: "and", x: 1040, y: passY[1] },
    { id: "selected", type: "or", x: 1280, y: outY },
    { id: "out", type: "lamp", label: "OUT", x: 1500, y: outY + GATE_OUT - SWITCH_PIN },
  ];
  const { wires, link } = wiring();
  link("a0", "not0", 0, { color: "cyan", runBeforeEnd: 30 });
  link("a1", "not1", 0, { color: "amber", runBeforeEnd: 30 });
  for (const bit of range(4)) {
    const odd = Boolean(bit & 1);
    link(`d${bit}`, `pick${bit}`, 0, { color: "lime" });
    link(odd ? "a0" : "not0", `pick${bit}`, 1, {
      color: odd ? "cyan" : "blue",
      runBeforeEnd: odd ? 80 : 40,
    });
    link(`pick${bit}`, bit < 2 ? "low" : "high", bit & 1, { color: "lime", runBeforeEnd: 40 });
  }
  link("low", "lowPass", 0, { color: "lime" });
  link("high", "highPass", 0, { color: "lime" });
  link("not1", "lowPass", 1, { color: "coral", runBeforeEnd: 40 });
  link("a1", "highPass", 1, { color: "amber", runBeforeEnd: 70 });
  link("lowPass", "selected", 0, { color: "lime", runBeforeEnd: 40 });
  link("highPass", "selected", 1, { color: "lime", runBeforeEnd: 40 });
  link("selected", "out", 0, { color: "lime" });
  return { name: "4:1 multiplexer", nodes, wires };
}

export function routingDemo(kind: "decoder" | "mux" | "memory"): Circuit {
  if (kind === "decoder") return flatDecoder();
  if (kind === "mux") return flatMultiplexer();
  // Use bit 0 of the existing sixteen-byte RAM, tying unused data bits low.
  const b = new Builder();
  range(4).forEach((bit) => {
    b.add(`a${bit}`, "switch", 40, 40 + bit * 160, `A${bit}`);
  });
  b.add("data", "switch", 250, 40, "DATA", { value: true });
  b.add("we", "switch", 250, 220, "WRITE ENABLE");
  b.add("clock", "clock", 250, 400, "CLOCK");
  b.add("zero", "ground", 250, 580, "0");
  b.nodes.push(datapathNode("ram16", "memory", 500, 40));
  range(4).forEach((bit) => {
    b.connect(`a${bit}`, "memory", bit);
  });
  range(8).forEach((bit) => {
    b.connect(bit === 0 ? "data" : "zero", "memory", 4 + bit);
  });
  b.connect("we", "memory", 12);
  b.connect("clock", "memory", 13);
  b.add("read", "lamp", 800, 40, "READ");
  b.connect(["memory", 0], "read");
  return layoutCircuit(b.circuit("Sixteen addressed bits"));
}

export const DEVICE_KINDS = [
  "screen",
  "pixel",
  "blitter",
  "bank",
  "vram",
  "big-blitter",
  "scanout",
] as const;
export type DeviceKind = (typeof DEVICE_KINDS)[number];
export const DEVICE_ADDRESSES: Record<DeviceKind, number> = {
  screen: 0xf0,
  pixel: 0xf8,
  blitter: 0xe0,
  bank: 0xd8,
  vram: 0xd9,
  "big-blitter": 0xdc,
  scanout: 0xf0,
};

/** A manual CPU bus wired through the CPU's actual address decoder and devices. */
export function deviceDemo(kind: DeviceKind): Circuit {
  const b = new Builder();
  b.add("address", "input8", 40, 40, "ADDRESS", { numberValue: DEVICE_ADDRESSES[kind] });
  b.add("data", "input8", 40, 360, "DATA", { numberValue: 0 });
  b.add("we", "switch", 40, 680, "WRITE ENABLE");
  b.add("re", "switch", 40, 860, "READ ENABLE");
  b.add("clock", "clock", 40, 1040, "CLOCK");
  const address: Ref[] = range(8).map((bit) => ["address", bit]);
  const data: Ref[] = range(8).map((bit) => ["data", bit]);
  const big = ["bank", "vram", "big-blitter"].includes(kind);
  const read = addDataMemory(b, {
    address,
    data,
    we: "we",
    clock: "clock",
    ram: { id: "ram", x: 1200, y: 40 },
    screen: { id: "screen", x: 1200, y: 900, label: "SCREEN (F0–F7)" },
    pixel: {
      x: { id: "pixel-x", x: 1700, y: 40, label: "X (F8)" },
      y: { id: "pixel-y", x: 1700, y: 1000, label: "Y (F9)" },
      plotter: { id: "plotter", x: 2200, y: 40, label: "PIXEL PLOTTER (FA)" },
    },
    ...(kind === "blitter"
      ? {
          blitter: {
            unit: { id: "blitter", x: 2700, y: 40, label: "BLITTER (E0–E4)" },
            rom: { id: "sprite-rom", x: 2700, y: 2200 },
            bytes: [60, 66, 165, 129, 165, 153, 66, 60],
          },
        }
      : {}),
    ...(big ? { big: { card: { id: "big-screen", x: 2700, y: 40 }, re: "re" } } : {}),
    ...(kind === "scanout"
      ? {
          video: {
            scanout: { id: "scanout", x: 2700, y: 40 },
            crt: { id: "monitor", x: 3200, y: 40 },
            clock: "clock",
          },
        }
      : {}),
    x: 400,
    y: 1400,
  });
  b.add("read", "display8", 3200, 1800, "READ DATA");
  read.forEach((source, bit) => {
    b.connect(source, "read", bit);
  });
  // Keep the controls and the screen in the opening view. The shared decoder
  // remains editable below them, rather than crowding the device off screen.
  const focus = big ? "big-screen" : "screen";
  for (const node of b.nodes) {
    if (["address", "data", "we", "re", "clock"].includes(node.id)) {
      if (["we", "re", "clock"].includes(node.id)) {
        node.x = 210;
        node.y = ({ we: 40, re: 240, clock: 440 } as Record<string, number>)[node.id] ?? node.y;
      }
    } else if (node.id === focus) {
      node.x = 380;
      node.y = 40;
    } else node.y += 2400;
  }
  return layoutCircuit(b.circuit(`${kind} bus bench`));
}

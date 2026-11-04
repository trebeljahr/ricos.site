// Chapter demos use the same circuits as the editor, tutorials and CPU.
import { Builder, type Ref, range } from "./blockBuilder";
import { layoutCircuit } from "./circuitLayout";
import { addDataMemory, datapathNode } from "./datapathBlocks";
import {
  type Circuit,
  gateBlueprint,
  type LogicGate,
  PRESETS,
  type Wire,
  type WireColor,
} from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";
import { busPorts, CircuitKit } from "./tutorial/kit";
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

const ROW = 200;
/** Full adder ports, with the carry on top so the chain never crosses A and B. */
const FULL_ADDER_INPUTS = ["cin", "a", "b"];
const SUM_PIN = 42;
const A_PIN = 92.5;

/** A column of full adders, bit 0 on top, each passing its carry down to the next. */
function columnAdderDemo(width: 4 | 8, a: number, b: number): Circuit {
  const adder = layoutCircuit(boxedFullAdder());
  const stage = { ...adder, ports: { inputs: FULL_ADDER_INPUTS, outputs: ["sum", "carry"] } };
  const bits = range(width);
  const input = width === 4 ? "input4" : "input8";
  const part = { id: "a", type: input, x: 0, y: 0 } as const;
  const inputCentre = (nodeHeight(part) + 16) / 2;
  const inputX = 212 - nodeWidth(part);
  const adderX = 460;
  const lampX = adderX + 420;
  const displayX = lampX + 240;
  const rowY = (bit: number) => bit * ROW;
  const middle = rowY(width / 2) - (ROW - 126) / 2 - 21;
  // The eight sum pins of the display line up with the gap between the middle lamps.
  const displayPins = 40 + (((width - 1) / 2) * ((width + 1) * 24 + 92 - 64)) / width;
  const nodes: Circuit["nodes"] = [
    { id: "a", type: input, label: "A", numberValue: a, x: inputX, y: A_PIN - inputCentre },
    { id: "b", type: input, label: "B", numberValue: b, x: inputX, y: A_PIN - inputCentre + 360 },
    ...bits.map((bit) => ({
      id: `bit${bit}`,
      type: "module" as const,
      module: stage,
      label: `FULL ADDER ${bit}`,
      x: adderX,
      y: rowY(bit),
    })),
    ...bits.map((bit) => ({
      id: `out${bit}`,
      type: "lamp" as const,
      label: `SUM${bit}`,
      x: lampX,
      y: rowY(bit) + SUM_PIN - 63,
    })),
    { id: "cout", type: "lamp", label: "CARRY", x: lampX, y: rowY(width) + SUM_PIN - 63 },
    {
      id: "total",
      type: "display8",
      bits: width + 1,
      label: "A + B",
      x: displayX,
      y: middle - displayPins,
    },
  ];
  const wires: Circuit["wires"] = [];
  const link = (from: string, output: number, to: string, pin: number, extra: Partial<Wire> = {}) =>
    wires.push({ id: `${from}:${output}>${to}:${pin}`, from, output, to, input: pin, ...extra });
  for (const bit of bits) {
    const box = `bit${bit}`;
    link("a", bit, box, 1);
    link("b", bit, box, 2);
    if (bit > 0) link(`bit${bit - 1}`, 1, box, 0, { color: "violet", railBetweenParts: true });
    link(box, 0, `out${bit}`, 0, { color: "lime" });
    link(box, 0, "total", bit);
  }
  link(`bit${width - 1}`, 1, "cout", 0, { color: "violet" });
  link(`bit${width - 1}`, 1, "total", width, { color: "violet" });
  const operand = (id: "a" | "b", trunk: number, color: WireColor) => ({
    id,
    label: id.toUpperCase(),
    decimal: true,
    sources: bits.map((output) => ({ node: id, output })),
    trunkX: [trunk],
    color,
  });
  return {
    name: `${width}-bit adder`,
    nodes,
    wires,
    reflow: "column",
    lanes: [
      operand("a", adderX - 110, "cyan"),
      operand("b", adderX - 190, "amber"),
      {
        id: "sum",
        label: "SUM",
        decimal: true,
        sources: bits.map((bit) => ({ node: `bit${bit}` })),
        skip: bits.map((bit) => `out${bit}`),
        color: "lime",
      },
    ],
  };
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

export function routingDemo(kind: "decoder" | "mux" | "memory"): Circuit {
  if (kind === "decoder") return layoutCircuit(builtIn("decoder"));
  if (kind === "mux") {
    const kit = new CircuitKit(
      "4:1 multiplexer",
      [...busPorts("a", "A", 2), ...busPorts("d", "D", 4)],
      [{ id: "out", label: "OUT" }],
    );
    const selector = builtIn("selector");
    const low = kit.part("selector", selector, ["a0", "d0", "d1"], { label: "LOW PAIR" });
    const high = kit.part("selector", selector, ["a0", "d2", "d3"], { label: "HIGH PAIR" });
    const selected = kit.part("selector", selector, ["a1", low, high], { label: "SELECT PAIR" });
    return kit.out("out", selected).build();
  }
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

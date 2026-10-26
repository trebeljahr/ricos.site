// Chapter demos use the same circuits as the editor, tutorials and CPU.
import { Builder, type Ref, range } from "./blockBuilder";
import { layoutCircuit } from "./circuitLayout";
import { addDataMemory, datapathNode } from "./datapathBlocks";
import { type Circuit, gateBlueprint, type LogicGate, PRESETS } from "./logic";
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

function byteAdderDemo(): Circuit {
  const circuit = structuredClone(PRESETS["8-bit full adder"]);
  const stages = circuit.nodes.filter((node) => !/^[ab]\d$/.test(node.id));
  const diagram: Circuit = {
    ...circuit,
    name: "Eight-bit adder",
    nodes: [
      { id: "a", type: "input8", label: "A", numberValue: 13, x: 360, y: 80, outputSide: "bottom" },
      { id: "b", type: "input8", label: "B", numberValue: 29, x: 720, y: 80, outputSide: "bottom" },
      ...stages.map((node) => {
        const bit = Number(node.id.match(/\d$/)?.[0] ?? 0);
        if (node.type === "module")
          return {
            ...node,
            module: layoutCircuit(node.module!),
            x: 360 + bit * 400,
            y: 720,
            inputSide: "top" as const,
            outputSide: "bottom" as const,
          };
        if (node.id.startsWith("out"))
          return {
            ...node,
            label: `SUM${bit}`,
            x: 310 + bit * 400,
            y: 1080,
            inputSide: "top" as const,
          };
        return { ...node, x: node.id === "cin" ? 80 : 3560, y: 720 };
      }),
    ],
    wires: circuit.wires.map((wire) =>
      /^[ab]\d$/.test(wire.from)
        ? { ...wire, from: wire.from[0], output: Number(wire.from[1]) }
        : wire,
    ),
  };
  // Give each operand bit its own horizontal lane above the carry chain.
  // These authored routes use the renderer's bottom source and top module pins.
  diagram.wires = diagram.wires.map((wire) => {
    if (wire.from !== "a" && wire.from !== "b") return wire;
    const source = diagram.nodes.find((node) => node.id === wire.from)!;
    const target = diagram.nodes.find((node) => node.id === wire.to)!;
    const bit = wire.output ?? 0;
    const start = {
      x: source.x + 16 + (7 - bit) * ((nodeWidth(source) - 40) / 7),
      y: source.y + nodeHeight(source),
    };
    const end = { x: target.x + 16 + wire.input * ((nodeWidth(target) - 40) / 2), y: target.y };
    const lane = (wire.from === "a" ? 400 : 560) + bit * 18;
    return { ...wire, points: [start, { x: start.x, y: lane }, { x: end.x, y: lane }, end] };
  });
  return diagram;
}

export function adderDemo(kind: "sum" | "half" | "full" | "boxed-full" | "byte"): Circuit {
  if (kind === "byte") return byteAdderDemo();
  const base =
    kind === "full"
      ? PRESETS["Full adder"]
      : kind === "boxed-full"
        ? boxedFullAdder()
        : PRESETS["Half adder"];
  const circuit = structuredClone(base);
  if (kind === "sum") {
    circuit.name = "The sum bit";
    circuit.nodes = circuit.nodes.filter((node) => !["and", "carry"].includes(node.id));
    circuit.wires = circuit.wires.filter((wire) => !["and", "carry"].includes(wire.to));
  }
  circuit.nodes = circuit.nodes.map((node) => ({
    ...node,
    value: node.id === "a" || (["full", "boxed-full"].includes(kind) && node.id === "b"),
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
export function transistorLampDemo(wiring: SwitchLampWiring): Circuit {
  return wiring === "single"
    ? switchLampDemo("single")
    : gateBlueprint(lampGate(wiring), "transistor");
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

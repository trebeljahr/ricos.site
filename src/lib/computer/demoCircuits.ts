// Chapter demos use the same circuits as the editor, tutorials and CPU.
import { Builder, type Ref, range } from "./blockBuilder";
import { layoutCircuit } from "./circuitLayout";
import { addDataMemory, datapathNode } from "./datapathBlocks";
import { type Circuit, gateBlueprint, type LogicGate, PRESETS } from "./logic";
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

export function adderDemo(kind: "sum" | "half" | "full" | "boxed-full" | "byte"): Circuit {
  const base =
    kind === "byte"
      ? PRESETS["8-bit full adder"]
      : kind === "full"
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
    value:
      kind === "byte"
        ? /^a\d$/.test(node.id)
          ? Boolean(13 & (1 << Number(node.id.slice(1))))
          : /^b\d$/.test(node.id)
            ? Boolean(29 & (1 << Number(node.id.slice(1))))
            : node.value
        : node.id === "a" || (["full", "boxed-full"].includes(kind) && node.id === "b"),
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

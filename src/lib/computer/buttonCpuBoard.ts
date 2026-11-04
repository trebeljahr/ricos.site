// The button-interrupt CPU as the demo draws it: the same machine as `buttonCpuCircuit`,
// with memory decoding and video folded into one block and every byte on a lane. Parts
// stand in four bays. Each bay has the control and data trunks on its left; the bus driver
// beside each part feeds a rail under the bays that runs to the shared bus on the right,
// and the bus comes back over the top. So every part hears the bus the same way.
import { SIGNALS } from "../computerStepper";
import { range } from "./blockBuilder";
import { BUTTON_PROGRAM, buttonCpuCircuit } from "./buttonInterrupt";
import { layoutCircuit } from "./circuitLayout";
import { CPU_PARTS } from "./cpuPreset";
import type { Circuit, Node, Wire, WireLane } from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";
import { packageParts } from "./packageParts";

const MEMORY_MAP = "memory-map";

/** Parts that the button lesson never looks inside. */
const isFolded = (node: Node) =>
  (node.id.startsWith("ram-") && node.id !== "ram-lanes" && node.id !== "ram-drive") ||
  [
    CPU_PARTS.pixelX,
    `${CPU_PARTS.pixelX}-display`,
    CPU_PARTS.pixelY,
    `${CPU_PARTS.pixelY}-display`,
    CPU_PARTS.plotter,
    CPU_PARTS.scanout,
    CPU_PARTS.crt,
    CPU_PARTS.blitter,
    CPU_PARTS.blitterRom,
    "blitter-busy",
    CPU_PARTS.bigScreen,
  ].includes(node.id as never);

// A bay, measured from its control trunk.
const DATA_TRUNK = 80;
const PARTS = 190;
const PROBES = 680;
const DRIVERS = 960;
const COLLECTOR = 1130;
const BAY_WIDTH = 1240;
const FIRST_BAY = 1330;
const BAYS = 4;
const trunks = (offset: number) => range(BAYS).map((bay) => FIRST_BAY + bay * BAY_WIDTH + offset);

const CONTROL_RAIL = -80;
const BUS_RAIL = -150;
const ROW_GAP = 90;

type Row = { part?: string; beside?: string; probe?: string; merger?: string; driver?: string };

const BAY_ROWS: Row[][] = [
  [
    { part: "ir", probe: "ir-probe" },
    { part: "key", probe: "key-probe", merger: "key-lanes", driver: "key-drive" },
    { part: "pc", probe: "pc-probe", merger: "pc-lanes", driver: "pc-drive" },
    { part: "cmar", probe: "cmar-probe" },
    { part: "rom", merger: "rom-lanes", driver: "rom-drive" },
  ],
  [
    { part: "opr", probe: "opr-probe", merger: "opr-lanes", driver: "opr-drive" },
    { part: "acc", probe: "acc-probe", merger: "acc-lanes", driver: "acc-drive" },
    { part: "zero" },
    { part: "alu", merger: "alu-lanes", driver: "alu-drive" },
    { part: "flags", probe: "flags-probe" },
  ],
  [
    { part: "dmar", probe: "dmar-probe" },
    { part: MEMORY_MAP, merger: "ram-lanes", driver: "ram-drive" },
    { part: "ram" },
    { part: "screen" },
  ],
  [
    { part: "sp", probe: "sp-probe" },
    { part: "sp-step" },
    { part: "one", beside: "sp-move" },
    { part: "stack", merger: "stack-lanes", driver: "stack-drive" },
    { part: "out", probe: "out-probe" },
    { part: "vec-one", beside: "vec-zero", merger: "vector-lanes", driver: "vector-drive" },
    { part: "bus-probe" },
  ],
];

/** The left bay, by hand: control beside the interrupt path, the button below them. */
const LEFT_BAY: Record<string, [x: number, y: number]> = {
  clock: [30, 30],
  control: [220, 30],
  "key-unread": [620, 30],
  "key-waits": [790, 30],
  "ready-next": [960, 30],
  "key-ready": [1130, 30],
  "ie-kept": [620, 190],
  "ie-stays": [790, 190],
  "ie-next": [960, 190],
  ie: [1130, 190],
  "int-mid": [620, 530],
  "int-hold": [790, 530],
  "int-next": [960, 530],
  int: [1130, 530],
  "int-take": [790, 690],
  irq: [960, 690],
  "irq-probe": [1130, 690],
  halted: [620, 850],
  "button-raw": [30, 1020],
  "button-reset": [30, 1240],
  "button-interface": [220, 1020],
  "button-0": [620, 1020],
  "button-1": [620, 1170],
  "button-2": [620, 1320],
};

const INTERRUPT_PATH = [
  "key-unread",
  "key-waits",
  "ready-next",
  "key-ready",
  "ie-kept",
  "ie-stays",
  "ie-next",
  "ie",
  "int-mid",
  "int-hold",
  "int-next",
  "int",
  "int-take",
  "irq",
  "irq-probe",
];

const byteOf = (node: string, count = 8) => range(count).map((output) => ({ node, output }));

export function buttonCpuBoard(source = BUTTON_PROGRAM): Circuit {
  const cpu = buttonCpuCircuit(source);
  const folded = new Set(cpu.nodes.filter(isFolded).map((node) => node.id));
  const packaged = packageParts(cpu, folded, {
    id: MEMORY_MAP,
    x: 0,
    y: 0,
    label: "MEMORY MAP AND VIDEO",
  });
  const moved = new Map<string, { x: number; y: number }>();
  for (const [id, [x, y]] of Object.entries(LEFT_BAY)) moved.set(id, { x, y });
  const nodes = new Map(packaged.nodes.map((node) => [node.id, node]));
  const size = (id: string | undefined) => {
    const node = id ? nodes.get(id) : undefined;
    return node ? { width: nodeWidth(node), height: nodeHeight(node) } : { width: 0, height: 0 };
  };
  let bottom = 0;
  BAY_ROWS.forEach((rows, bay) => {
    const left = FIRST_BAY + bay * BAY_WIDTH;
    let y = 30;
    for (const { part, beside, probe, merger, driver } of rows) {
      if (part) moved.set(part, { x: left + PARTS, y });
      if (beside) moved.set(beside, { x: left + PARTS + size(part).width + 30, y });
      if (probe) moved.set(probe, { x: left + PROBES, y });
      const stack = probe && merger ? y + size(probe).height + 30 : y;
      if (merger) moved.set(merger, { x: left + PROBES, y: stack });
      if (driver)
        moved.set(driver, {
          x: left + DRIVERS,
          y: stack + (size(merger).height - size(driver).height) / 2,
        });
      y +=
        ROW_GAP + Math.max(size(part).height, stack - y + size(merger).height, size(probe).height);
    }
    bottom = Math.max(bottom, y);
  });
  // Eight constants feed the key port: they stand in a column under the interrupt path.
  for (const bit of range(8)) moved.set(`key-bit${bit}`, { x: 1130, y: 1020 + bit * 130 });
  const busX = FIRST_BAY + BAYS * BAY_WIDTH + 70;
  moved.set(CPU_PARTS.bus, { x: busX, y: bottom / 2 - 300 });
  moved.set("aux-bus", { x: busX, y: bottom / 2 + 100 });
  moved.set("bus-lanes", { x: busX + size(CPU_PARTS.bus).width + 60, y: bottom / 2 - 300 });

  const named = (id: string) => nodes.get(id)?.label ?? id;
  const portsTo = (to: string) =>
    [
      ...new Set(
        packaged.wires
          .filter((wire) => wire.from === MEMORY_MAP && wire.to === to)
          .map((wire) => wire.output as number),
      ),
    ]
      .sort((a, b) => a - b)
      .map((output) => ({ node: MEMORY_MAP, output }));
  const lanes: WireLane[] = [
    {
      id: "bus",
      label: "BUS",
      sources: byteOf("bus-lanes"),
      bus: CPU_PARTS.bus,
      trunkX: trunks(DATA_TRUNK),
      via: [{ x: busX + size(CPU_PARTS.bus).width + 300, y: BUS_RAIL }],
      color: "amber",
    },
    {
      id: "control",
      label: "CONTROL",
      sources: byteOf(CPU_PARTS.control, SIGNALS.length + 1),
      names: [...SIGNALS, "GCLK"],
      trunkX: trunks(0),
      via: [{ x: FIRST_BAY, y: CONTROL_RAIL }],
      // The interrupt path stands beside the control unit: short plain wires reach it.
      skip: [...INTERRUPT_PATH, "button-interface", "halted"],
      color: "violet",
    },
    ...[
      "ir",
      "key",
      "pc",
      "cmar",
      "rom",
      "opr",
      "acc",
      "dmar",
      "sp",
      "sp-step",
      "stack",
      "ram",
    ].map((id): WireLane => ({ id, label: named(id), sources: byteOf(id), color: "cyan" })),
    { id: "alu", label: "ALU", sources: byteOf("alu"), color: "cyan" },
    { id: "out", label: "OUTPUT", sources: byteOf("out"), color: "cyan" },
    { id: "screen", label: "SCREEN", sources: byteOf("screen", 16), color: "blue" },
    { id: "to-ram", label: "TO RAM", sources: portsTo("ram"), color: "blue" },
    { id: "to-screen", label: "TO SCREEN", sources: portsTo("screen"), color: "blue" },
    { id: "read", label: "READ", sources: portsTo("ram-lanes"), color: "blue" },
    {
      id: "code",
      label: "CODE",
      sources: range(8).map((bit) => ({ node: `key-bit${bit}` })),
      color: "lime",
    },
  ];
  // Each driver's output drops to the rail under the bays and runs along it to the bus.
  const rail = bottom + 40;
  const collect = (wire: Wire): Wire => {
    const from = moved.get(wire.from);
    const to = moved.get(wire.to);
    const isDriver = wire.from.endsWith("-drive") || wire.from === "aux-bus";
    if (!from || !to || !isDriver) return wire;
    const bay = Math.floor((from.x - FIRST_BAY) / BAY_WIDTH);
    const down = FIRST_BAY + bay * BAY_WIDTH + COLLECTOR;
    if (wire.from === "aux-bus") return wire;
    const y = from.y + size(wire.from).height / 2;
    const beforeBus = busX - 60;
    return {
      ...wire,
      points: [
        { x: from.x + size(wire.from).width, y },
        { x: down, y },
        { x: down, y: rail },
        { x: beforeBus, y: rail },
        { x: beforeBus, y: to.y + 40 },
        { x: to.x, y: to.y + 40 },
      ],
    };
  };
  return {
    ...packaged,
    nodes: packaged.nodes.map((node) => {
      const at = moved.get(node.id);
      const placed = at ? { ...node, ...at } : node;
      return node.id === MEMORY_MAP && node.module
        ? { ...placed, module: layoutCircuit(node.module) }
        : placed;
    }),
    wires: packaged.wires.map(collect),
    groups: [
      {
        id: "interrupt",
        label: "Interrupt path",
        nodeIds: INTERRUPT_PATH,
        activeWhen: CPU_PARTS.int,
      },
    ],
    lanes,
  };
}

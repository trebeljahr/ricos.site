import { type BusValue, formatBus } from "../../bus";
import { type Circuit, initialSnapshot, type Node, step } from "../../logic";
import { busPorts, CircuitKit } from "../kit";
import type { Level } from "../types";
import { constructionHints } from "./constructionHints";
import { once } from "./shared";

const SECTION = "Buses and enables";
const INPUTS = busPorts("d", "D", 8);
const OUTPUTS = busPorts("q", "Q", 8);

export const busLanesLevel: Level = {
  id: "bus-lanes",
  title: "Pack and unpack a byte",
  section: SECTION,
  optional: true,
  goal: "Carry D0–D7 over one eight-lane bus and recover each bit on its Q output.",
  palette: ["merger", "splitter"],
  rules: (circuit) =>
    circuit.nodes.some((node) => node.type === "merger") &&
    circuit.nodes.some((node) => node.type === "splitter")
      ? []
      : ["Use a merger and a splitter to carry the byte over a bus."],
  spec: { kind: "truth", inputs: INPUTS, outputs: OUTPUTS, fn: (bits) => bits },
  reference: once(() => {
    const kit = new CircuitKit("Byte bus lanes", INPUTS, OUTPUTS);
    const pack = kit.gate(
      "merger",
      INPUTS.map((port) => port.id),
    );
    const split = kit.gate("splitter", [pack]);
    OUTPUTS.forEach((port, bit) => {
      kit.out(port.id, [split, bit]);
    });
    return kit.build();
  }),
  hints: constructionHints(
    "The bus keeps eight separate lanes inside one wire. Packing must preserve each bit’s position.",
    "Connect D0 to merger input 0 and continue in order through D7.",
    "Pack the bits with a merger and unpack them with a splitter, keeping each bit in its own lane.",
    "Turn on only D0, then only D7. Q0 and Q7 must follow without swapping places. Then try alternating bits.",
  ),
};

type BusCase = {
  a: number;
  b?: number;
  ea: boolean;
  eb?: boolean;
  expected: BusValue;
  note: string;
};

const busNodes = (shared: boolean): Node[] => [
  { id: "a", type: "input8", x: 40, y: 40, label: shared ? "A" : "DATA", numberValue: 0 },
  { id: "ea", type: "switch", x: 320, y: 120, label: shared ? "ENABLE A" : "ENABLE", value: false },
  ...(shared
    ? [
        { id: "b", type: "input8" as const, x: 40, y: 400, label: "B", numberValue: 0 },
        { id: "eb", type: "switch" as const, x: 320, y: 480, label: "ENABLE B", value: false },
      ]
    : []),
  { id: "net", type: "bus", x: 1100, y: shared ? 260 : 140, label: "SHARED BUS" },
];

function busReference(shared: boolean): Circuit {
  const nodes = busNodes(shared);
  const wires: Circuit["wires"] = [];
  for (const [index, source] of (shared ? ["a", "b"] : ["a"]).entries()) {
    const merge = `merge-${source}`,
      driver = `drive-${source}`;
    nodes.push(
      { id: merge, type: "merger", x: 520, y: 40 + index * 360 },
      { id: driver, type: "busdriver", x: 770, y: 100 + index * 360 },
    );
    for (let bit = 0; bit < 8; bit++)
      wires.push({ id: `${source}-${bit}`, from: source, output: bit, to: merge, input: bit });
    wires.push(
      { id: `${source}-packed`, from: merge, to: driver, input: 0 },
      { id: `${source}-enabled`, from: `e${source}`, to: driver, input: 1 },
      { id: `${source}-bus`, from: driver, to: "net", input: index },
    );
  }
  return { name: shared ? "Shared bus enables" : "Tri-state enable", nodes, wires };
}

function busLesson(shared: boolean, cases: BusCase[]): Level {
  const reference = once(() => busReference(shared));
  return {
    id: shared ? "shared-bus" : "bus-enable",
    title: shared ? "Share a bus between two sources" : "Enable a tri-state driver",
    section: SECTION,
    optional: true,
    goal: shared
      ? "Each enabled source drives SHARED BUS: none gives Z, and two different bytes give X."
      : "SHARED BUS carries DATA while ENABLE is on and floats (Z) while it is off.",
    palette: ["merger", "splitter", "busdriver", "bus"],
    start: () => ({
      circuit: { name: reference().name, nodes: busNodes(shared), wires: [] },
      locked: busNodes(shared).map((node) => node.id),
    }),
    reference,
    spec: {
      kind: "custom",
      observed: ["net"],
      describe: shared
        ? "Floating, driven, equal-driver, and conflicting-driver cases"
        : "All 256 bytes with ENABLE off and on, checking actual bus values",
      grade: (circuit) => {
        for (const test of cases) {
          const trial = {
            ...circuit,
            nodes: circuit.nodes.map((node) =>
              node.id === "a" || node.id === "b"
                ? { ...node, numberValue: node.id === "a" ? test.a : (test.b ?? 0) }
                : node,
            ),
          };
          const snapshot = step(
            trial,
            initialSnapshot(),
            false,
            {},
            { ea: test.ea, eb: test.eb ?? false },
          );
          const actual = snapshot.buses?.net ?? "Z";
          if (snapshot.unstable || actual !== test.expected)
            return {
              pass: false,
              summary: `${test.note} Expected ${formatBus(test.expected)}, got ${formatBus(actual)}.`,
              table: {
                head: ["DATA / A", "B", "ENABLE A", "ENABLE B", "Expected", "Actual"],
                rows: [
                  [
                    String(test.a),
                    shared ? String(test.b) : "—",
                    String(Number(test.ea)),
                    shared ? String(Number(test.eb)) : "—",
                    formatBus(test.expected),
                    formatBus(actual),
                  ],
                ],
              },
            };
        }
        return {
          pass: true,
          summary: "The bus carries the expected byte, Z, or X in every checked case.",
        };
      },
    },
    hints: constructionHints(
      "ENABLE controls the connection, not the data value. Z means no driver, 0 is a driven zero, and X means conflicting values. AND-gating every bit produces a driven zero rather than Z.",
      "Pack each numeric source’s eight outputs with a MERGER, then feed that bus into a BUS DRIVER.",
      shared
        ? "Give each byte its own bus driver and enable, and let both drivers feed the shared bus."
        : "Put a bus driver between the packed DATA byte and the bus, with ENABLE on its enable pin.",
      shared
        ? "Use A=85 and B=170. Enable A alone, B alone, neither, then both. Expect 0x55, 0xAA, Z, X."
        : "Set DATA to zero and toggle ENABLE. The bus must change between 0x00 and Z. Try 255 to check every lane.",
    ),
  };
}

export const busEnableLevel = busLesson(
  false,
  Array.from({ length: 256 }, (_, a) => [
    { a, ea: false, expected: "Z" as const, note: `DATA=${a}, ENABLE=0 disconnects the source.` },
    { a, ea: true, expected: a, note: `DATA=${a}, ENABLE=1 drives the byte.` },
  ]).flat(),
);

export const sharedBusLevel = busLesson(
  true,
  [
    [0, 0],
    [0, 255],
    [85, 170],
    [255, 0],
    [255, 255],
    ...Array.from({ length: 8 }, (_, bit) => [1 << bit, 255 ^ (1 << bit)]),
  ].flatMap(([a, b]) =>
    [false, true].flatMap((ea) =>
      [false, true].map(
        (eb): BusCase => ({
          a,
          b,
          ea,
          eb,
          expected: ea && eb ? (a === b ? a : "X") : ea ? a : eb ? b : "Z",
          note: `A=${a}, B=${b}, ENABLE A=${Number(ea)}, ENABLE B=${Number(eb)}.`,
        }),
      ),
    ),
  ),
);

export const BUS_LEVELS: Level[] = [busLanesLevel, busEnableLevel, sharedBusLevel];

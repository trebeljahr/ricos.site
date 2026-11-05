// What a number input shows when it unfolds: one switch per bit, a display of
// the number, and the output pins. Its switches hold the number while it is open.
import {
  type Circuit,
  type Node,
  NUMBER_INPUT_BITS,
  type NumberInputType,
  type Wire,
} from "./logic";
import { nodeHeight, nodeWidth } from "./nodeGeometry";

const SWITCH_STEP = 140;
const SWITCH_CENTRE = 63;
const CLEARANCE = 24;
const TRACK = 20;
const SWITCH_PREFIX = "bit";

/** The bit an unfolded number input's switch stands for. */
export const switchBit = (id: string) => Number(id.slice(SWITCH_PREFIX.length));

/** The lines pass above and below the display and each gives it a tap, so few wires cross. */
export function numberInputCircuit(node: Node): Circuit {
  const width = NUMBER_INPUT_BITS[node.type as NumberInputType];
  const name = node.label ?? "";
  const bits = Array.from({ length: width }, (_, bit) => bit);
  const display: Node = {
    id: "number",
    type: width === 4 ? "display4" : "display8",
    x: 0,
    y: 0,
    label: name,
    ...(width !== 4 && width !== 8 ? { bits: width } : {}),
  };
  const lower = Math.ceil(width / 2);
  const displayHeight = nodeHeight(display);
  const switchY = (bit: number) =>
    bit * SWITCH_STEP + (bit >= lower ? displayHeight + CLEARANCE * 2 - SWITCH_STEP : 0);
  const line = (bit: number) => switchY(bit) + SWITCH_CENTRE;
  const switchWidth = nodeWidth({ id: "", type: "switch", x: 0, y: 0 });
  display.x = switchWidth + CLEARANCE + lower * TRACK + CLEARANCE;
  display.y = line(lower - 1) + CLEARANCE;
  const pin = (bit: number) =>
    display.y + 40 + (bit * (displayHeight - 40 - 24)) / Math.max(1, width - 1);
  const wires: Wire[] = [];
  for (const bit of bits) {
    const track = display.x - CLEARANCE - (bit < lower ? bit : width - 1 - bit) * TRACK;
    const start = { x: switchWidth, y: line(bit) };
    const end = { x: display.x, y: pin(bit) };
    wires.push(
      {
        id: `tap${bit}`,
        from: `${SWITCH_PREFIX}${bit}`,
        to: display.id,
        input: bit,
        color: node.opensToSwitches,
        points: [start, { x: track, y: start.y }, { x: track, y: end.y }, end],
      },
      {
        id: `out${bit}`,
        from: `${SWITCH_PREFIX}${bit}`,
        to: `pin${bit}`,
        input: 0,
        color: node.opensToSwitches,
      },
    );
  }
  return {
    name: `${width}-bit input`,
    fixedParts: true,
    ports: { inputs: [], outputs: bits.map((bit) => `pin${bit}`) },
    nodes: [
      ...bits.map(
        (bit): Node => ({
          id: `${SWITCH_PREFIX}${bit}`,
          type: "switch",
          x: 0,
          y: switchY(bit),
          label: `${name}${bit}`,
          value: Boolean(((node.numberValue ?? 0) >> bit) & 1),
        }),
      ),
      display,
      ...bits.map(
        (bit): Node => ({
          id: `pin${bit}`,
          type: "lamp",
          x: display.x + nodeWidth(display) + 60,
          y: switchY(bit),
          label: `${name}${bit}`,
        }),
      ),
    ],
    wires,
  };
}

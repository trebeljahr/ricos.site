import { cmosTopology } from "./cmosTopology";
import type { Circuit, Node } from "./logic";
import { isMosfet, transistorPortPoint } from "./transistorGeometry";

/** Lay out MOS stages with sources entering above PMOS and below NMOS.
 * Used for built-ins and explicit Arrange; saved reader layouts never reflow automatically.
 */
export function layoutCmosBlueprint(circuit: Circuit): Circuit {
  const nodes = circuit.nodes.map((node) => ({ ...node }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (
    !["vcc", "gnd", "out"].every((id) => byId.has(id)) ||
    !nodes.some((node) => node.type === "switch")
  )
    return circuit;
  const { incoming, branch, stages, kinds } = cmosTopology({ ...circuit, nodes });
  if (!stages.length) return circuit;
  const outputY = 420;
  const transistorHeight = 132;
  const outputGap = 144;
  const seriesPitch = transistorHeight + 32;
  const pullUpY = outputY - outputGap / 2 - transistorHeight;
  const pullDownY = outputY + outputGap / 2;
  const stageColumns = new Map<string, number>();
  const gateControls = new Map<string, string[]>();
  for (const [index, stage] of stages.entries()) {
    const x = 380 + index * 680;
    stage.x = x + 88;
    stage.y = outputY - 5;
    const controls = [
      ...new Set(
        branch(stage.id)
          .filter(isMosfet)
          .map((part) => incoming(part.id).find((wire) => wire.input === 0)!.from),
      ),
    ];
    for (const part of branch(stage.id).filter(isMosfet)) gateControls.set(part.id, controls);
    for (const type of ["pmos", "nmos"] as const) {
      const parts = branch(stage.id).filter((part) => part.type === type);
      const rank = (part: Node): number => {
        const source = incoming(part.id).find((wire) => wire.input === 1);
        const parent = source && byId.get(source.from);
        if (parent?.type === type) return rank(parent) + 1;
        if (parent?.type === "junction" && kinds(parent.id).size === 1) {
          const upstream = branch(parent.id).filter((node) => node.type === type);
          if (upstream.length) return Math.max(...upstream.map(rank)) + 1;
        }
        return 0;
      };
      const lastRank = Math.max(...parts.map(rank));
      const rows = new Map<number, number>();
      for (const part of parts) {
        const level = rank(part),
          column = rows.get(level) ?? 0;
        rows.set(level, column + 1);
        stageColumns.set(part.id, x);
        part.x = x + column * 220;
        part.y =
          type === "pmos"
            ? pullUpY - (lastRank - level) * seriesPitch
            : pullDownY + (lastRank - level) * seriesPitch;
      }
      for (const root of branch(stage.id).filter(
        (part) => part.type === "junction" && part.id !== stage.id,
      )) {
        const upstream = branch(root.id).filter(isMosfet);
        if (!upstream.length || upstream.some((part) => part.type !== type)) continue;
        const feedsTransistor = circuit.wires.some(
          (wire) => wire.from === root.id && wire.input === 1 && isMosfet(byId.get(wire.to)!),
        );
        root.x = x + 198 - 5;
        const maxRank = Math.max(...upstream.map(rank));
        const outerY =
          type === "pmos"
            ? pullUpY - (lastRank - maxRank) * seriesPitch + transistorHeight + 16
            : pullDownY + (lastRank - maxRank) * seriesPitch - 16;
        root.y = (feedsTransistor ? outerY : outputY + (type === "pmos" ? -24 : 24)) - 5;
      }
    }
  }
  const supply = byId.get("vcc")!,
    ground = byId.get("gnd")!;
  const switches = nodes.filter((node) => node.type === "switch");
  switches.forEach((node, index) => {
    Object.assign(node, { x: 40, y: outputY - 63 + (index - (switches.length - 1) / 2) * 164 });
  });
  // Keep power beside the controls; the outer rails still enter transistor sources from outside.
  Object.assign(supply, { x: 40, y: switches[0].y - 116 - 32, outputSide: "top" });
  Object.assign(ground, { x: 40, y: switches.at(-1)!.y + 126 + 32, outputSide: "bottom" });
  const supplyRail =
    Math.min(supply.y, ...nodes.filter((node) => node.type === "pmos").map((node) => node.y)) - 24;
  const groundRail =
    Math.max(
      ground.y + 116,
      ...nodes.filter((node) => node.type === "nmos").map((node) => node.y + transistorHeight),
    ) + 24;
  Object.assign(byId.get("out")!, { x: stages.at(-1)!.x + 330, y: outputY - 63 });
  const point = (node: Node, input?: number) =>
    isMosfet(node)
      ? transistorPortPoint(node, input ?? 0, input === undefined ? "output" : "input")
      : node.type === "junction"
        ? { x: node.x + 5, y: node.y + 5 }
        : {
            x:
              node.x +
              (node.type === "high" || node.type === "ground"
                ? 132 / 2
                : input === undefined
                  ? 132
                  : 0),
            y:
              node.y +
              (node.type === "high" || node.type === "ground"
                ? node.outputSide === "top"
                  ? 0
                  : 116
                : (node.type === "lamp" || node.type === "switch" ? 126 : 116) / 2),
          };
  return {
    ...circuit,
    nodes,
    wires: circuit.wires.map((wire) => {
      const from = byId.get(wire.from)!,
        to = byId.get(wire.to)!;
      const start = point(from),
        end = point(to, wire.input);
      let bends: { x: number; y: number }[];
      if (from.type === "high" || from.type === "ground") {
        const y = from.type === "high" ? supplyRail : groundRail;
        bends = [
          { x: start.x, y },
          { x: end.x, y },
        ];
      } else if (isMosfet(to) && wire.input === 0) {
        const stageX = stageColumns.get(to.id)!;
        const controls = gateControls.get(to.id)!;
        const controlIndex = controls.indexOf(wire.from);
        const x = stageX - 45 - controlIndex * 30;
        const entryX = to.x - 55;
        const railY = to.type === "pmos" ? to.y + transistorHeight + 24 : to.y - 24;
        const sourceStage = stages.findIndex((stage) => stage.id === from.id);
        const signalY =
          outputY + (wire.from === "a" ? -40 : wire.from === "b" ? 40 : sourceStage === 0 ? -8 : 8);
        const exitX = from.type === "switch" ? (wire.from === "a" ? 210 : 240) : start.x + 35;
        bends = [
          { x: exitX, y: start.y },
          { x: exitX, y: signalY },
          { x, y: signalY },
          { x, y: to.x === stageX ? end.y : railY },
          ...(to.x === stageX
            ? []
            : [
                { x: entryX, y: railY },
                { x: entryX, y: end.y },
              ]),
        ];
      } else if (
        isMosfet(to) &&
        wire.input === 1 &&
        (from.type === "switch" || (from.type === "junction" && kinds(from.id).size === 2))
      ) {
        const y = to.type === "pmos" ? supplyRail - 28 : groundRail + 28;
        const x = from.type === "switch" ? 210 : start.x + 160;
        bends = [
          { x, y: start.y },
          { x, y },
          { x: end.x, y },
        ];
      } else if (isMosfet(from) && isMosfet(to)) {
        bends = [];
      } else if (isMosfet(from)) {
        bends = [{ x: start.x, y: end.y }];
      } else {
        bends = [{ x: end.x, y: start.y }];
      }
      return { ...wire, points: [start, ...bends, end] };
    }),
  };
}

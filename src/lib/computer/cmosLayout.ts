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
  const firstStageX = 380;
  let nextStageX = firstStageX;
  for (const stage of stages) {
    const x = nextStageX;
    // Junction coordinates describe the dot's box; its centre must share the drain axis.
    stage.x = x + 88 - 5;
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
        // A plain parallel pair ties straight into its stage's drain axis.
        root.x = (feedsTransistor ? x + 198 : x + 88) - 5;
        const maxRank = Math.max(...upstream.map(rank));
        const outerY =
          type === "pmos"
            ? pullUpY - (lastRank - maxRank) * seriesPitch + transistorHeight + 16
            : pullDownY + (lastRank - maxRank) * seriesPitch - 16;
        root.y = (feedsTransistor ? outerY : outputY + (type === "pmos" ? -24 : 24)) - 5;
      }
    }
    nextStageX =
      Math.max(
        ...branch(stage.id)
          .filter(isMosfet)
          .map((part) => part.x),
      ) +
      132 +
      180;
  }
  const supply = byId.get("vcc")!,
    ground = byId.get("gnd")!;
  const switches = nodes.filter((node) => node.type === "switch");
  switches.forEach((node, index) => {
    Object.assign(node, { x: 40, y: outputY - 63 + (index - (switches.length - 1) / 2) * 164 });
  });
  // Each rail runs straight out of its power part, with the controls entering between the rails.
  const powerHeight = 116;
  const supplyRail = Math.min(
    switches[0].y - 32 - powerHeight / 2,
    ...nodes.filter((node) => node.type === "pmos").map((node) => node.y - 24),
  );
  const groundRail = Math.max(
    switches.at(-1)!.y + 126 + 32 + powerHeight / 2,
    ...nodes.filter((node) => node.type === "nmos").map((node) => node.y + transistorHeight + 24),
  );
  Object.assign(supply, { x: 40, y: supplyRail - powerHeight / 2, outputSide: "right" });
  Object.assign(ground, { x: 40, y: groundRail - powerHeight / 2, outputSide: "right" });
  const outputX =
    Math.max(
      ...branch(stages.at(-1)!.id)
        .filter(isMosfet)
        .map((node) => node.x + 132),
    ) + 64;
  Object.assign(byId.get("out")!, { x: outputX, y: outputY - 63 });
  const point = (node: Node, input?: number) =>
    isMosfet(node)
      ? transistorPortPoint(node, input ?? 0, input === undefined ? "output" : "input")
      : node.type === "junction"
        ? { x: node.x + 5, y: node.y + 5 }
        : {
            x: node.x + (input === undefined ? 132 : 0),
            y: node.y + (node.type === "lamp" || node.type === "switch" ? 126 : powerHeight) / 2,
          };
  return {
    ...circuit,
    nodes,
    groups: circuit.groups?.map((group) =>
      group.id === "construction"
        ? {
            ...group,
            nodeIds: [...new Set([...group.nodeIds, ...switches.map((node) => node.id)])],
          }
        : group,
    ),
    wires: circuit.wires.map((wire) => {
      const from = byId.get(wire.from)!,
        to = byId.get(wire.to)!;
      const start = point(from),
        end = point(to, wire.input);
      let bends: { x: number; y: number }[];
      if (from.type === "high" || from.type === "ground") {
        bends = [{ x: end.x, y: start.y }];
      } else if (isMosfet(to) && wire.input === 0) {
        const stageX = stageColumns.get(to.id)!;
        const controls = gateControls.get(to.id)!;
        const controlIndex = controls.indexOf(wire.from);
        // A farther column's gate climbs beside the stage, so it crosses the other control once.
        const x = to.x === stageX ? stageX - 45 - controlIndex * 30 : stageX - 20;
        const entryX = to.x - 55;
        const sourceStage = stages.findIndex((stage) => stage.id === from.id);
        const straightControl =
          controls.length === 1 && (from.type === "junction" || switches.length === 1);
        const signalY =
          outputY +
          (straightControl
            ? 0
            : wire.from === "a"
              ? -40
              : wire.from === "b"
                ? 40
                : sourceStage === 0
                  ? -8
                  : 8);
        // A control already level with the gap between the stage's parts stays on its line.
        const gapY = to.type === "pmos" ? to.y + transistorHeight + 24 : to.y - 24;
        const railY = Math.abs(gapY - signalY) < 24 ? signalY : gapY;
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
        // A pass source from a switch leaves the rail's entry clear, beside the first stage.
        const x = from.type === "switch" ? firstStageX - 75 : start.x + 160;
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
      // Power keeps one colour in every gate instead of taking its turn in the wire palette.
      const railColor = { high: "coral", ground: "violet" } as const;
      const color = wire.color ?? railColor[from.type as keyof typeof railColor];
      return { ...wire, color, points: [start, ...bends, end] };
    }),
  };
}

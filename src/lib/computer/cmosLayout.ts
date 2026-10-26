import type { Circuit, Node } from "./logic";
import { isMosfet, transistorPortPoint } from "./transistorGeometry";

/** Lay out complementary stages as supply → pull-up → OUT → pull-down → ground.
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
  const incoming = (id: string) => circuit.wires.filter((wire) => wire.to === id);
  const branch = (id: string, seen = new Set<string>()): Node[] => {
    if (seen.has(id)) return [];
    seen.add(id);
    const node = byId.get(id)!;
    if (!isMosfet(node) && node.type !== "junction") return [];
    return [
      node,
      ...incoming(id)
        .filter((wire) => node.type === "junction" || wire.input === 1)
        .flatMap((wire) => branch(wire.from, seen)),
    ];
  };
  const stages = nodes.filter(
    (node) =>
      node.type === "junction" &&
      incoming(node.id).every((wire) => {
        const types = new Set(
          branch(wire.from)
            .filter(isMosfet)
            .map((part) => part.type),
        );
        return types.size === 1;
      }) &&
      new Set(
        branch(node.id)
          .filter(isMosfet)
          .map((part) => part.type),
      ).size === 2,
  );
  if (!stages.length) return circuit;
  const outputY = 420;
  const transistorHeight = 132;
  const outputGap = 144;
  const seriesPitch = transistorHeight + 32;
  const pullUpY = outputY - outputGap / 2 - transistorHeight;
  const pullDownY = outputY + outputGap / 2;
  const stageColumns = new Map<string, number>();
  for (const [index, stage] of stages.entries()) {
    const x = 380 + index * 680;
    stage.x = x + 88;
    stage.y = outputY - 5;
    for (const type of ["pmos", "nmos"] as const) {
      const parts = branch(stage.id).filter((part) => part.type === type);
      const rank = (part: Node): number => {
        const source = incoming(part.id).find((wire) => wire.input === 1);
        const parent = source && byId.get(source.from);
        return parent?.type === type ? rank(parent) + 1 : 0;
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
      for (const wire of incoming(stage.id)) {
        const root = byId.get(wire.from)!;
        if (root.type === "junction" && branch(root.id).some((part) => part.type === type)) {
          root.x = x + 308;
          root.y = outputY + (type === "pmos" ? -24 : 24) - 5;
        }
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
        const x = stageX - (wire.from === "b" ? 55 : 85);
        const entryX = to.x - 55;
        const railY = to.type === "pmos" ? pullUpY + transistorHeight + 24 : pullDownY - 24;
        bends =
          to.x === stageX
            ? [
                { x, y: start.y },
                { x, y: end.y },
              ]
            : [
                { x, y: start.y },
                { x, y: railY },
                { x: entryX, y: railY },
                { x: entryX, y: end.y },
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

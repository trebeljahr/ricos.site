import type { Circuit, Node, Wire } from "./logic";
import { isMosfet } from "./transistorGeometry";
import type { Point } from "./wireRouting";
import { wireNetKeys } from "./wireTopology";

/** Presentation coordinates for the actual CMOS graph. No gates or wires are synthesized here. */
export function cmosLampLayout(circuit: Circuit) {
  const byId = new Map(circuit.nodes.map((node) => [node.id, node]));
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
  const stages = circuit.nodes.filter(
    (node) =>
      node.type === "junction" &&
      incoming(node.id).every(
        (wire) =>
          new Set(
            branch(wire.from)
              .filter(isMosfet)
              .map((part) => part.type),
          ).size === 1,
      ) &&
      new Set(
        branch(node.id)
          .filter(isMosfet)
          .map((part) => part.type),
      ).size === 2,
  );
  const positions = new Map<string, Point>();
  const stageFor = new Map<string, { left: number; index: number; first: number }>();
  const labels = new Map<string, string>([
    ["a", "A"],
    ["b", "B"],
  ]);
  let left = 200;
  for (const [index, stage] of stages.entries()) {
    const parts = branch(stage.id).filter(isMosfet);
    const rank = (node: Node): number => {
      const source = incoming(node.id).find((wire) => wire.input === 1)!;
      const parent = byId.get(source.from)!;
      if (isMosfet(parent)) return rank(parent) + 1;
      if (parent.type === "junction")
        return Math.max(...branch(parent.id).filter(isMosfet).map(rank)) + 1;
      return 0;
    };
    const groups = new Map<string, Node[]>();
    for (const part of parts) {
      const key = `${part.type}:${rank(part)}`;
      groups.set(key, [...(groups.get(key) ?? []), part]);
    }
    const columns = Math.max(...[...groups.values()].map((group) => group.length));
    const width = 100 + (columns - 1) * 120;
    const center = left + width / 2;
    positions.set(stage.id, { x: center, y: 280 });
    const controlIds = new Set(
      parts.map((part) => incoming(part.id).find((wire) => wire.input === 0)!.from),
    );
    labels.set(
      stage.id,
      parts.length === 2 && controlIds.size === 1 && controlIds.has("a")
        ? "Ā"
        : parts.length === 2 && controlIds.size === 1 && controlIds.has("b")
          ? "B̄"
          : "X",
    );
    if (index === stages.length - 1) labels.set(stage.id, "OUT");
    for (const type of ["pmos", "nmos"] as const) {
      const typed = parts.filter((part) => part.type === type);
      const series = typed.some((part) => rank(part) > 0);
      for (const part of typed) {
        const level = rank(part),
          group = groups.get(`${type}:${level}`)!;
        const x = group.length === 1 ? center : left + 50 + group.indexOf(part) * 120;
        const y =
          type === "pmos" ? (series ? 140 + level * 88 : 180) : series ? 470 - level * 88 : 380;
        positions.set(part.id, { x, y });
        stageFor.set(part.id, { left, index, first: left + 50 });
      }
      for (const junction of branch(stage.id).filter(
        (node) => node.type === "junction" && node.id !== stage.id,
      )) {
        const upstream = branch(junction.id).filter(isMosfet);
        if (!upstream.length || upstream.some((part) => part.type !== type)) continue;
        const feedsTransistor = circuit.wires.some(
          (wire) => wire.from === junction.id && wire.input === 1 && isMosfet(byId.get(wire.to)!),
        );
        const maxRank = Math.max(...upstream.map(rank));
        const y = feedsTransistor
          ? type === "pmos"
            ? 184 + maxRank * 88
            : 426 - maxRank * 88
          : type === "pmos"
            ? 256
            : 336;
        positions.set(junction.id, { x: center, y });
      }
    }
    left += width + 80;
  }
  const width = Math.max(800, left + 120);
  positions.set("vcc", { x: 80, y: 48 });
  positions.set("gnd", { x: 80, y: 600 });
  // Local labeled inputs can sit beside the lower network, keeping the board short.
  const selectorY = 550;
  const freeColumns = Array.from(
    { length: Math.floor((width - 120) / 160) },
    (_, i) => 200 + i * 160,
  ).filter(
    (x) =>
      x < width - 90 &&
      !circuit.nodes.filter(isMosfet).some((node) => {
        const p = positions.get(node.id)!;
        return Math.abs(p.y - selectorY) < 94 && Math.abs(p.x - x) < 109;
      }),
  );
  positions.set("a", { x: freeColumns[0] ?? 240, y: selectorY - 40 });
  if (byId.has("b")) positions.set("b", { x: freeColumns[1] ?? 400, y: selectorY - 40 });
  positions.set("out", { x: width - 124, y: 280 });
  const point = (id: string, input?: number): Point => {
    const node = byId.get(id)!,
      p = positions.get(id)!;
    if (!isMosfet(node)) return p;
    return input === 0
      ? { x: p.x - 46, y: p.y }
      : { x: p.x, y: p.y + ((input === 1) === (node.type === "nmos") ? 34 : -34) };
  };
  const nets = wireNetKeys(circuit);
  const compact = (points: Point[]) =>
    points.filter((p, i, all) => !i || p.x !== all[i - 1].x || p.y !== all[i - 1].y);
  const gateWire = (wire: Wire) => isMosfet(byId.get(wire.to)!) && wire.input === 0;
  const currentPoints = (wire: Wire): Point[] => {
    const from = byId.get(wire.from)!,
      start = point(from.id),
      end = point(wire.to, wire.input);
    const bends =
      from.type === "ground"
        ? [{ x: end.x, y: start.y }]
        : from.type === "high"
          ? [{ x: end.x, y: start.y }]
          : isMosfet(from)
            ? [{ x: start.x, y: end.y }]
            : [{ x: end.x, y: start.y }];
    return compact([start, ...bends, end]);
  };
  const occupied = circuit.wires
    .filter((wire) => !gateWire(wire))
    .map((wire) => ({ net: nets[wire.id], points: currentPoints(wire) }));
  const wires = circuit.wires.map((wire) => {
    const from = byId.get(wire.from)!,
      to = byId.get(wire.to)!;
    const start = point(from.id),
      end = point(to.id, wire.input);
    if (!gateWire(wire)) return { ...wire, points: currentPoints(wire) };
    const stage = stageFor.get(to.id)!;
    const controls = [
      ...new Set(
        branch(stages[stage.index].id)
          .filter(isMosfet)
          .map((node) => incoming(node.id).find((wire) => wire.input === 0)!.from),
      ),
    ];
    const lane =
      from.type === "switch"
        ? from.id === "a"
          ? 140
          : 172
        : stage.left - 25 - controls.indexOf(from.id) * 14;
    const entryX = end.x - 4;
    // Cross earlier stages between device rows, never through their packages.
    const horizontalClear = (y: number) =>
      !occupied.some(
        (route) =>
          route.net !== nets[wire.id] &&
          route.points.slice(1).some((b, i) => {
            const a = route.points[i];
            return (
              a.y === b.y &&
              Math.abs(a.y - y) < 5 &&
              Math.min(Math.max(a.x, b.x), Math.max(lane, entryX)) >
                Math.max(Math.min(a.x, b.x), Math.min(lane, entryX))
            );
          }),
      ) &&
      !circuit.nodes.filter(isMosfet).some((node) => {
        const p = positions.get(node.id)!;
        return (
          y >= p.y - 35 &&
          y <= p.y + 35 &&
          Math.max(lane, entryX) >= p.x - 44 &&
          Math.min(lane, entryX) <= p.x + 44
        );
      });
    const direction = to.type === "pmos" ? -1 : 1;
    const entry =
      [
        0,
        44 * direction,
        -44 * direction,
        60 * direction,
        -60 * direction,
        88 * direction,
        -88 * direction,
        104 * direction,
        -104 * direction,
      ]
        .map((offset) => end.y + offset)
        .find(horizontalClear) ?? end.y;
    const originY =
      from.type === "switch"
        ? start.y - (from.id === "b" ? 12 : 0)
        : start.y + (labels.get(from.id) === "Ā" ? -16 : 16);
    const bends = [
      ...(from.type === "switch"
        ? [{ x: start.x, y: originY }]
        : [
            { x: start.x + 28, y: start.y },
            { x: start.x + 28, y: originY },
          ]),
      { x: lane, y: originY },
      { x: lane, y: entry },
      ...(entry === end.y
        ? []
        : [
            { x: entryX, y: entry },
            { x: entryX, y: end.y },
          ]),
    ];
    const points = compact([start, ...bends, end]);
    occupied.push({ net: nets[wire.id], points });
    return { ...wire, points };
  });
  return { width, height: 640, selectorY, positions, labels, wires, stages };
}

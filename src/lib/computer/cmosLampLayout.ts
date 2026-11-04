import { cmosTopology } from "./cmosTopology";
import type { Circuit, Node, Wire } from "./logic";
import { isMosfet } from "./transistorGeometry";
import type { Point } from "./wireRouting";
import { wireNetKeys } from "./wireTopology";

/** Presentation coordinates for the actual CMOS graph. No gates or wires are synthesized here. */
export function cmosLampLayout(circuit: Circuit) {
  const byId = new Map(circuit.nodes.map((node) => [node.id, node]));
  const { incoming, branch, stages, kinds } = cmosTopology({ ...circuit, nodes: circuit.nodes });
  const positions = new Map<string, Point>();
  const labels = new Map<string, string>([
    ["a", "A"],
    ["b", "B"],
  ]);
  let left = 400;
  for (const [index, stage] of stages.entries()) {
    const parts = branch(stage.id).filter(isMosfet);
    const rank = (node: Node): number => {
      const source = incoming(node.id).find((wire) => wire.input === 1)!;
      const parent = byId.get(source.from)!;
      if (parent.type === node.type) return rank(parent) + 1;
      if (parent.type === "junction" && kinds(parent.id).size === 1)
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
    const railInverter =
      parts.length === 2 &&
      controlIds.size === 1 &&
      parts.every(
        (part) =>
          incoming(part.id).find((wire) => wire.input === 1)!.from ===
          (part.type === "pmos" ? "vcc" : "gnd"),
      );
    labels.set(
      stage.id,
      railInverter && controlIds.has("a")
        ? "Ā"
        : railInverter && controlIds.has("b")
          ? "B̄"
          : parts.some((part) =>
                incoming(part.id).some((wire) => wire.input === 1 && wire.from === "a"),
              )
            ? "XOR"
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
  const width = Math.max(820, left + 120);
  positions.set("vcc", { x: 80, y: 48 });
  const groundY = 550;
  positions.set("gnd", { x: 80, y: groundY });
  const inputSwitches = circuit.nodes
    .filter((node) => node.type === "switch")
    .map((node, index) => {
      const x = 220;
      const y = index === 0 ? 180 : 470;
      const lane = index === 0 ? 380 : 340;
      // Side by side, so the pull-downs never share a run to the ground rail.
      const pullDownX = index === 0 ? 310 : 324;
      return {
        id: node.id,
        x,
        y,
        lane,
        contact: { x: x - 56, y },
        output: { x: x + 56, y },
        pullDown: { x: pullDownX, y: y + 42 },
      };
    });
  for (const input of inputSwitches) positions.set(input.id, input.output);
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
    if (
      isMosfet(byId.get(wire.to)!) &&
      wire.input === 1 &&
      (from.type === "switch" || (from.type === "junction" && kinds(from.id).size === 2))
    ) {
      const upper = byId.get(wire.to)!.type === "pmos";
      const y = upper ? 90 : 466;
      const x = from.type === "switch" ? 140 : start.x + 68;
      return compact([start, { x, y: start.y }, { x, y }, { x: end.x, y }, end]);
    }
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
  const inputWires = inputSwitches.flatMap((input) => [
    {
      id: `${input.id}-supply`,
      from: "vcc",
      to: input.id,
      net: nets[circuit.wires.find((wire) => wire.from === "vcc")!.id],
      currentSource: input.id,
      signal: false,
      points: [{ x: 80, y: 48 }, { x: 132, y: 48 }, { x: 132, y: input.y }, input.contact],
    },
    // The pull-down empties the gate when the switch opens, so no input is left floating.
    {
      id: `${input.id}-pull-down`,
      from: input.id,
      to: input.id,
      net: nets[circuit.wires.find((wire) => wire.from === input.id)!.id],
      signal: false,
      points: [
        { x: input.pullDown.x, y: input.y },
        { x: input.pullDown.x, y: input.pullDown.y - 20 },
      ],
    },
    {
      id: `${input.id}-ground`,
      from: "gnd",
      to: input.id,
      net: nets[circuit.wires.find((wire) => wire.from === "gnd")!.id],
      signal: false,
      points: [
        { x: input.pullDown.x, y: input.pullDown.y + 20 },
        { x: input.pullDown.x, y: groundY },
      ],
    },
  ]);
  const devices = circuit.nodes.filter(isMosfet);
  const horizontalClear = (x1: number, x2: number, y: number) =>
    !devices.some((node) => {
      const p = positions.get(node.id)!;
      return (
        y > p.y - 35 && y < p.y + 35 && Math.max(x1, x2) > p.x - 44 && Math.min(x1, x2) < p.x + 44
      );
    });
  const wires = circuit.wires.map((wire) => {
    const from = byId.get(wire.from)!,
      to = byId.get(wire.to)!;
    const start = point(wire.from),
      end = point(wire.to, wire.input);
    const controlledSource =
      isMosfet(to) &&
      wire.input === 1 &&
      (from.type === "switch" || (from.type === "junction" && kinds(from.id).size === 2));
    if (!gateWire(wire) && !controlledSource) return { ...wire, points: currentPoints(wire) };
    const input = inputSwitches.find((input) => input.id === from.id);
    let prefix: Point[], lane: number;
    if (input) {
      // Inputs face the transistor stages, so each net leaves its switch
      // directly into one vertical trunk, without routing back underneath it.
      lane = input.lane;
      prefix = [start, { x: lane, y: start.y }];
    } else {
      const sourceStage = stages.find((stage) => stage.id === from.id)!;
      lane =
        Math.max(
          ...branch(sourceStage.id)
            .filter(isMosfet)
            .map((part) => positions.get(part.id)!.x),
        ) + 60;
      prefix = [start, { x: lane, y: start.y }];
    }
    if (controlledSource) {
      const direction = to.type === "pmos" ? -1 : 1;
      const y = [24, 44, 64, 88, 112, 140]
        .map((offset) => end.y + direction * offset)
        .find((y) => horizontalClear(lane, end.x, y));
      if (y === undefined) throw new Error(`No clear source route for ${wire.id}`);
      return { ...wire, points: compact([...prefix, { x: lane, y }, { x: end.x, y }, end]) };
    }
    const entryX = end.x - 16;
    const y = [0, -44, 44, -64, 64, -88, 88, -112, 112, -140, 140]
      .map((offset) => end.y + offset)
      .find((y) => horizontalClear(lane, entryX, y));
    if (y === undefined) throw new Error(`No clear gate route for ${wire.id}`);
    return {
      ...wire,
      points: compact([...prefix, { x: lane, y }, { x: entryX, y }, { x: entryX, y: end.y }, end]),
    };
  });
  return {
    width,
    height: 600,
    groundY,
    inputSwitches,
    inputWires,
    positions,
    labels,
    wires,
    stages,
  };
}

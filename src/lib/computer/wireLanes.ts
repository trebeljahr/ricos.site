// A lane draws a set of same-purpose wires, such as a byte's eight bits, as one band.
// It changes only the drawing: the wires stay in the circuit and simulate as before.
// A lane names its sources, so a wire added from one of them joins the lane by itself,
// and a removed wire leaves it.
import { formatBus } from "./bus";
import type { Circuit, Snapshot, Wire, WireLane } from "./logic";
import type { Point, PortSide } from "./wireRouting";

/** How far a comb stands off the ports it joins. */
export const LANE_STUB = 26;

export type LaneTap = { id: string; to: string; wires: Wire[] };
export type ResolvedLane = { lane: WireLane; taps: LaneTap[] };
export type ResolvedLanes = {
  lanes: ResolvedLane[];
  /** The tap that draws each lane wire. Wires absent here draw on their own. */
  tapOf: ReadonlyMap<string, LaneTap>;
};
export const NO_LANES: ResolvedLanes = { lanes: [], tapOf: new Map() };

const portKey = (node: string, output: number) => `${node}:${output}`;

export function resolveLanes(circuit: Pick<Circuit, "lanes" | "wires" | "nodes">): ResolvedLanes {
  if (!circuit.lanes?.length) return NO_LANES;
  const laneOf = new Map<string, ResolvedLane>();
  const lanes = circuit.lanes.map((lane) => {
    const resolved: ResolvedLane = { lane, taps: [] };
    for (const source of lane.sources)
      laneOf.set(portKey(source.node, source.output ?? 0), resolved);
    return resolved;
  });
  const known = new Set(circuit.nodes.map((node) => node.id));
  const tapOf = new Map<string, LaneTap>();
  for (const wire of circuit.wires) {
    // A hand-routed wire keeps its own route. A wire to a missing part is not drawn at all.
    if (wire.points || !known.has(wire.to)) continue;
    const resolved = laneOf.get(portKey(wire.from, wire.output ?? 0));
    if (!resolved || resolved.lane.skip?.includes(wire.to)) continue;
    let tap = resolved.taps.find((item) => item.to === wire.to);
    if (!tap) {
      tap = { id: `lane:${resolved.lane.id}:${wire.to}`, to: wire.to, wires: [] };
      resolved.taps.push(tap);
    }
    tap.wires.push(wire);
    tapOf.set(wire.id, tap);
  }
  return { lanes: lanes.filter((lane) => lane.taps.length), tapOf };
}

const vector = (side: PortSide): Point =>
  ({
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
  })[side];

/** Joins ports to the bar a stub away from them; `anchor` is the middle of that bar. */
export function laneComb(ports: readonly Point[], side: PortSide) {
  const step = vector(side);
  // A straight bar even when an unfolded part has moved one of the ports further out.
  const reach = (values: number[], direction: number) =>
    direction > 0 ? Math.max(...values) : Math.min(...values);
  const barX =
    reach(
      ports.map((port) => port.x),
      step.x,
    ) +
    step.x * LANE_STUB;
  const barY =
    reach(
      ports.map((port) => port.y),
      step.y,
    ) +
    step.y * LANE_STUB;
  const ends = ports.map((port) => ({
    x: step.x ? barX : port.x,
    y: step.y ? barY : port.y,
  }));
  const xs = ends.map((end) => end.x);
  const ys = ends.map((end) => end.y);
  const first = { x: Math.min(...xs), y: Math.min(...ys) };
  const last = { x: Math.max(...xs), y: Math.max(...ys) };
  const stubs = ports.map((port, i) => `M ${port.x} ${port.y} L ${ends[i].x} ${ends[i].y}`);
  return {
    anchor: { x: Math.round((first.x + last.x) / 2), y: Math.round((first.y + last.y) / 2) },
    stubs: stubs.join(" "),
    bar: `M ${first.x} ${first.y} L ${last.x} ${last.y}`,
  };
}

/** The route of a stem whose lane has fixed trunks; `undefined` leaves it to the wire router. */
export function trunkRoute(lane: WireLane, start: Point, end: Point): Point[] | undefined {
  if (!lane.trunkX?.length) return undefined;
  const trunk = lane.trunkX.reduce(
    (best, x) => (x <= end.x && x > best ? x : best),
    lane.trunkX[0],
  );
  const via = lane.via ?? [];
  const route = [
    start,
    { x: via[0]?.x ?? trunk, y: start.y },
    ...via,
    { x: trunk, y: via.at(-1)?.y ?? start.y },
    { x: trunk, y: end.y },
    end,
  ];
  return route.filter(
    (point, i) => i === 0 || point.x !== route[i - 1].x || point.y !== route[i - 1].y,
  );
}

/** What a lane carries now. A lane with `bus` reads that node, so it can float or conflict. */
export function laneValue(
  lane: WireLane,
  snapshot: Pick<Snapshot, "outputs" | "values" | "buses">,
): { text: string; state: "low" | "high" | "floating" | "conflict" } {
  if (lane.bus) {
    const value = snapshot.buses?.[lane.bus] ?? "Z";
    return {
      text: formatBus(value),
      state: value === "Z" ? "floating" : value === "X" ? "conflict" : value === 0 ? "low" : "high",
    };
  }
  const bits = lane.sources.map(({ node, output = 0 }) =>
    Boolean(snapshot.outputs[node]?.[output] ?? snapshot.values[node]),
  );
  const state = bits.some(Boolean) ? "high" : "low";
  if (lane.names) {
    const on = lane.names.filter((_, i) => bits[i]);
    return {
      text: on.length > 3 ? `${on.slice(0, 3).join(" ")} +${on.length - 3}` : on.join(" ") || "—",
      state,
    };
  }
  const value = bits.reduce((sum, bit, i) => sum + (bit ? 2 ** i : 0), 0);
  if (lane.decimal) return { text: String(value), state };
  return {
    text: `0x${value
      .toString(16)
      .toUpperCase()
      .padStart(Math.ceil(bits.length / 4), "0")}`,
    state,
  };
}

/** Drops anything a stored lane should not carry; `undefined` when it is not a lane. */
export function validLane(value: unknown, colors: object = {}): WireLane | undefined {
  const item = value as Partial<WireLane> | null;
  if (
    !item ||
    typeof item.id !== "string" ||
    typeof item.label !== "string" ||
    !Array.isArray(item.sources) ||
    !item.sources.every((source) => source && typeof source.node === "string")
  )
    return undefined;
  const finite = (point: Point) => Number.isFinite(point?.x) && Number.isFinite(point?.y);
  return {
    id: item.id.slice(0, 100),
    label: item.label.slice(0, 30),
    sources: item.sources.map(({ node, output }) => ({
      node,
      ...(typeof output === "number" ? { output } : {}),
    })),
    ...(typeof item.bus === "string" ? { bus: item.bus } : {}),
    ...(Array.isArray(item.names) && item.names.every((name) => typeof name === "string")
      ? { names: [...item.names] }
      : {}),
    ...(item.decimal === true ? { decimal: true } : {}),
    ...(Array.isArray(item.skip) && item.skip.every((id) => typeof id === "string")
      ? { skip: [...item.skip] }
      : {}),
    ...(Array.isArray(item.trunkX) && item.trunkX.every(Number.isFinite)
      ? { trunkX: [...item.trunkX] }
      : {}),
    ...(Array.isArray(item.via) && item.via.every(finite)
      ? { via: item.via.map(({ x, y }) => ({ x, y })) }
      : {}),
    ...(typeof item.color === "string" && Object.hasOwn(colors, item.color)
      ? { color: item.color }
      : {}),
  };
}

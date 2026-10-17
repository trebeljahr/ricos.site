import type { Point } from "./wireRouting";

export const polylinePath = (points: Point[]) =>
  points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
const mix = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
const length = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** Flatten the absolute M/L/Q/C paths emitted by the router. Also used for hit testing. */
export function pathPoints(path: string): Point[][] {
  const tokens = path.match(/[MLQC]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const paths: Point[][] = [];
  let points: Point[] = [],
    cursor = { x: 0, y: 0 },
    i = 0;
  const point = () => ({ x: Number(tokens[i++]), y: Number(tokens[i++]) });
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === "M") {
      const start = point();
      // Rotated-port paths resume with M at the end of their connector stub.
      if (!points.length || length(cursor, start) > 0.001) {
        points = [start];
        paths.push(points);
      }
      cursor = start;
    } else if (command === "L") {
      cursor = point();
      points.push(cursor);
    } else if (command === "Q" || command === "C") {
      const start = cursor,
        a = point(),
        b = point(),
        end = command === "C" ? point() : b;
      const count = Math.min(
        256,
        Math.max(
          4,
          Math.ceil((length(start, a) + length(a, b) + (command === "C" ? length(b, end) : 0)) / 8),
        ),
      );
      for (let step = 1; step <= count; step++) {
        const t = step / count;
        points.push(
          command === "C"
            ? mix(mix(mix(start, a, t), mix(a, b, t), t), mix(mix(a, b, t), mix(b, end, t), t), t)
            : mix(mix(start, a, t), mix(a, end, t), t),
        );
      }
      cursor = end;
    } else break;
  }
  return paths;
}

export function closestPathPoint(path: string, point: Point) {
  let best = { point, distance: Infinity, points: [] as Point[], index: 0 };
  for (const points of pathPoints(path))
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        dx = b.x - a.x,
        dy = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
      );
      const hit = mix(a, b, t),
        distance = length(hit, point);
      if (distance < best.distance) best = { point: hit, distance, points, index: i };
    }
  return best;
}

/** Keep the saved centre of a split route while its two terminals follow moved parts. */
export function explicitWirePath(points: Point[], start: Point, end: Point) {
  const first = points[0],
    last = points[points.length - 1];
  const dx = start.x - first.x,
    dy = start.y - first.y;
  if (Math.abs(end.x - last.x - dx) < 0.001 && Math.abs(end.y - last.y - dy) < 0.001)
    return polylinePath(points.map((point) => ({ x: point.x + dx, y: point.y + dy })));
  return polylinePath([start, ...points.slice(1, -1), end]);
}

type Segment = { a: Point; b: Point; start: number; wire: number };
/** Add one arch at each geometric crossing. Shared terminals remain plain joins. */
export function bridgeWirePaths(wires: { id: string; path: string }[]) {
  const result: Record<string, string> = Object.fromEntries(
    wires.map((wire) => [wire.id, wire.path]),
  );
  const paths = wires.map((wire) => pathPoints(wire.path));
  const segments: Segment[] = [],
    distances: number[] = [];
  const starts: Point[][] = paths.map((parts) =>
    parts.flatMap((points) => [points[0], points[points.length - 1]]),
  );
  paths.forEach((parts, wire) => {
    let at = 0;
    for (const points of parts)
      for (let i = 1; i < points.length; i++) {
        segments.push({ a: points[i - 1], b: points[i], start: at, wire });
        at += length(points[i - 1], points[i]);
      }
    distances[wire] = at;
  });
  const crossings = new Map<number, { at: number; point: Point; dx: number; dy: number }[]>();
  // Spatial bins avoid an all-pairs scan on large gate diagrams.
  const cell = segments.reduce(
    (size, { a, b }) =>
      Math.max(
        size,
        Math.abs(a.x) / 256,
        Math.abs(a.y) / 256,
        Math.abs(b.x) / 256,
        Math.abs(b.y) / 256,
      ),
    96,
  );
  const bins = new Map<string, number[]>();
  const checked = new Set<string>();
  segments.forEach((segment, index) => {
    const { a, b } = segment;
    for (
      let x = Math.floor(Math.min(a.x, b.x) / cell);
      x <= Math.floor(Math.max(a.x, b.x) / cell);
      x++
    )
      for (
        let y = Math.floor(Math.min(a.y, b.y) / cell);
        y <= Math.floor(Math.max(a.y, b.y) / cell);
        y++
      ) {
        const key = `${x}:${y}`,
          previous = bins.get(key) ?? [];
        for (const otherIndex of previous) {
          const other = segments[otherIndex];
          if (other.wire === segment.wire) continue;
          const pair = `${otherIndex}:${index}`;
          if (checked.has(pair)) continue;
          checked.add(pair);
          const dx = b.x - a.x,
            dy = b.y - a.y,
            ex = other.b.x - other.a.x,
            ey = other.b.y - other.a.y;
          const det = dx * ey - dy * ex;
          if (!Number.isFinite(det) || Math.abs(det) < 0.00001) continue;
          const cx = other.a.x - a.x,
            cy = other.a.y - a.y;
          const t = (cx * ey - cy * ex) / det,
            u = (cx * dy - cy * dx) / det;
          if (t < -0.00001 || t > 1.00001 || u < -0.00001 || u > 1.00001) continue;
          const point = mix(a, b, t);
          // Never put a bridge beside a shared endpoint or an existing splice dot.
          if (
            starts[segment.wire].some((p) => length(p, point) < 9) ||
            starts[other.wire].some((p) => length(p, point) < 9)
          )
            continue;
          const owner = segment.wire > other.wire ? segment : other;
          const at = owner.start + length(owner.a, point),
            len = length(owner.a, owner.b);
          if (at < 9 || distances[owner.wire] - at < 9 || !len) continue;
          const list = crossings.get(owner.wire) ?? [];
          if (!list.some((crossing) => Math.abs(crossing.at - at) < 16)) {
            list.push({
              at,
              point,
              dx: (owner.b.x - owner.a.x) / len,
              dy: (owner.b.y - owner.a.y) / len,
            });
            crossings.set(owner.wire, list);
          }
        }
        previous.push(index);
        bins.set(key, previous);
      }
  });
  for (const [wire, crossingsOnWire] of crossings) {
    // Bus trunks contain separate subpaths; each crossing is owned by a single drawn segment.
    let at = 0,
      path = "";
    const sorted = crossingsOnWire.sort((a, b) => a.at - b.at);
    for (const points of paths[wire]) {
      path += ` M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1],
          b = points[i],
          len = length(a, b),
          endAt = at + len;
        for (const crossing of sorted)
          if (crossing.at >= at && crossing.at < endAt) {
            const r = 6,
              { point: p, dx, dy } = crossing;
            path += ` L ${p.x - dx * r} ${p.y - dy * r} Q ${p.x - dy * 12} ${p.y + dx * 12} ${p.x + dx * r} ${p.y + dy * r}`;
          }
        // Skip the piece beneath an arch, even if it straddles sampled curve segments.
        if (!sorted.some((crossing) => endAt > crossing.at - 6 && endAt < crossing.at + 6))
          path += ` L ${b.x} ${b.y}`;
        at = endAt;
      }
    }
    result[wires[wire].id] = path.trim();
  }
  return result;
}

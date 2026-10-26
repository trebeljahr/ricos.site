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
  const middle = points.slice(1, -1).map((point) => ({ ...point }));
  const entry = middle[0],
    exit = middle[middle.length - 1];
  if (entry && exit) {
    // Keep the authored rail while its perpendicular leads follow moved pins.
    if (middle.length === 1 && first.x === entry.x && entry.x === last.x)
      return polylinePath([start, { x: start.x, y: entry.y }, { x: end.x, y: entry.y }, end]);
    if (middle.length === 1 && first.y === entry.y && entry.y === last.y)
      return polylinePath([start, { x: entry.x, y: start.y }, { x: entry.x, y: end.y }, end]);
    if (first.x === points[1].x) entry.x = start.x;
    else if (first.y === points[1].y) entry.y = start.y;
    if (last.x === points[points.length - 2].x) exit.x = end.x;
    else if (last.y === points[points.length - 2].y) exit.y = end.y;
  }
  return polylinePath([start, ...middle, end]);
}

export type DrawnWire = { id: string; path: string; net?: string };
type DrawCommand = { command: string; text: string; a: Point; b: Point; controls: Point[] };
type Segment = { a: Point; b: Point; wire: number; command: number; straight: boolean };

function drawCommands(path: string): DrawCommand[] {
  let cursor = { x: 0, y: 0 };
  return [...path.matchAll(/[MLQC][^MLQC]*/g)].map(([text]) => {
    const numbers = (text.slice(1).match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    const points = Array.from({ length: numbers.length / 2 }, (_, i) => ({
      x: numbers[i * 2],
      y: numbers[i * 2 + 1],
    }));
    const result = {
      command: text[0],
      text: text.trim(),
      a: cursor,
      b: points[points.length - 1],
      controls: points.slice(0, -1),
    };
    cursor = result.b;
    return result;
  });
}

function onStraightSegment(point: Point, { a, b }: Pick<Segment, "a" | "b">) {
  const epsilon = 0.001;
  return (
    (Math.abs(a.x - b.x) < epsilon
      ? Math.abs(point.x - a.x) < epsilon
      : Math.abs(point.y - a.y) < epsilon) &&
    point.x >= Math.min(a.x, b.x) - epsilon &&
    point.x <= Math.max(a.x, b.x) + epsilon &&
    point.y >= Math.min(a.y, b.y) - epsilon &&
    point.y <= Math.max(a.y, b.y) + epsilon
  );
}

function drawnSegments(commands: DrawCommand[][]): Segment[] {
  return commands.flatMap((parts, wire) =>
    parts.flatMap((part, command) => {
      if (part.command === "M") return [];
      const points = pathPoints(`M ${part.a.x} ${part.a.y} ${part.text}`)[0];
      return points.slice(1).map((b, i) => ({
        a: points[i],
        b,
        wire,
        command,
        straight: part.command === "L" && (part.a.x === part.b.x || part.a.y === part.b.y),
      }));
    }),
  );
}

/** Shared signals meet at square T junctions; reserve arches for separate nets. */
export function bridgeWirePaths(wires: DrawnWire[]) {
  const commands = wires.map((wire) => drawCommands(wire.path));
  const terminals = commands.map((parts) =>
    parts.flatMap((part, i) =>
      part.command === "M"
        ? [part.b, ...(i ? [parts[i - 1].b] : [])]
        : i === parts.length - 1
          ? [part.b]
          : [],
    ),
  );
  let segments = drawnSegments(commands);
  // A rounded branch would peel away from its own trunk. Keep that joint square.
  commands.forEach((parts, wire) => {
    if (!wires[wire].net) return;
    for (const part of parts) {
      if (part.command !== "Q" || part.controls.length !== 1) continue;
      const corner = part.controls[0];
      if (
        !(
          (part.a.x === corner.x && part.b.y === corner.y) ||
          (part.a.y === corner.y && part.b.x === corner.x)
        )
      )
        continue;
      const shared = segments.some(
        (other) =>
          other.wire !== wire &&
          wires[other.wire].net === wires[wire].net &&
          other.straight &&
          onStraightSegment(corner, other),
      );
      if (shared) part.text = `L ${corner.x} ${corner.y} L ${part.b.x} ${part.b.y}`;
    }
  });
  const joined = commands.map((parts) => parts.map((part) => part.text).join(" "));
  // Reparse the restored corners so their straight sections can own bridges too.
  const joinedCommands = joined.map(drawCommands);
  segments = drawnSegments(joinedCommands);
  const crossings = new Map<string, { point: Point; at: number }[]>();
  // Spatial bins keep large gate diagrams out of an all-pairs scan.
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
  const bins = new Map<string, number[]>(),
    checked = new Set<string>();
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
          if (
            other.wire === segment.wire ||
            (wires[segment.wire].net && wires[segment.wire].net === wires[other.wire].net)
          )
            continue;
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
          // Touching a bend is not a transverse crossing.
          if (t <= 0.00001 || t >= 0.99999 || u <= 0.00001 || u >= 0.99999) continue;
          const point = mix(a, b, t);
          if (
            [segment.wire, other.wire].some((wire) =>
              terminals[wire].some((p) => length(p, point) < 10),
            )
          )
            continue;
          // The entire arch must fit on one straight section, clear of both bends.
          const owner = [segment, other].find(
            (s) => s.straight && length(s.a, point) >= 10 && length(s.b, point) >= 10,
          );
          if (!owner) continue;
          const ownerKey = `${owner.wire}:${owner.command}`,
            at = length(owner.a, point);
          const list = crossings.get(ownerKey) ?? [];
          if (!list.some((crossing) => Math.abs(crossing.at - at) < 16)) {
            list.push({ point, at });
            crossings.set(ownerKey, list);
          }
        }
        previous.push(index);
        bins.set(key, previous);
      }
  });
  return Object.fromEntries(
    joinedCommands.map((parts, wire) => [
      wires[wire].id,
      parts
        .map((part, command) => {
          const list = crossings.get(`${wire}:${command}`);
          if (!list) return part.text;
          const len = length(part.a, part.b),
            dx = (part.b.x - part.a.x) / len,
            dy = (part.b.y - part.a.y) / len;
          const nx = dy ? -1 : 0,
            ny = dx ? -1 : 0;
          return (
            list
              .sort((a, b) => a.at - b.at)
              .map(
                ({ point: p }) =>
                  `L ${p.x - dx * 6} ${p.y - dy * 6} Q ${p.x + nx * 12} ${p.y + ny * 12} ${p.x + dx * 6} ${p.y + dy * 6}`,
              )
              .join(" ") + ` L ${part.b.x} ${part.b.y}`
          );
        })
        .join(" "),
    ]),
  );
}

/** Dot only real branches (three or more directions) of one electrical net. */
export function wireJunctions(wires: DrawnWire[]): (Point & { wire: string })[] {
  const groups = new Map<string, DrawnWire[]>();
  for (const wire of wires)
    if (wire.net) groups.set(wire.net, [...(groups.get(wire.net) ?? []), wire]);
  const result: (Point & { wire: string })[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const commands = group.map((wire) => drawCommands(wire.path));
    const segments = drawnSegments(commands).filter((segment) => segment.straight);
    const candidates = new Map<string, Point>();
    for (const { a, b } of segments) {
      candidates.set(`${a.x}:${a.y}`, a);
      candidates.set(`${b.x}:${b.y}`, b);
    }
    for (let i = 0; i < segments.length; i++)
      for (let j = i + 1; j < segments.length; j++) {
        const first = segments[i],
          second = segments[j];
        if (first.wire === second.wire) continue;
        const horizontal = first.a.y === first.b.y ? first : second;
        const vertical = first.a.x === first.b.x ? first : second;
        if (
          horizontal === vertical ||
          horizontal.a.y !== horizontal.b.y ||
          vertical.a.x !== vertical.b.x
        )
          continue;
        const point = { x: vertical.a.x, y: horizontal.a.y };
        if (
          point.x >= Math.min(horizontal.a.x, horizontal.b.x) &&
          point.x <= Math.max(horizontal.a.x, horizontal.b.x) &&
          point.y >= Math.min(vertical.a.y, vertical.b.y) &&
          point.y <= Math.max(vertical.a.y, vertical.b.y)
        )
          candidates.set(`${point.x}:${point.y}`, point);
      }
    for (const point of candidates.values()) {
      const rays = new Set<string>();
      const owners = new Set<number>();
      for (const segment of segments) {
        if (!onStraightSegment(point, segment)) continue;
        owners.add(segment.wire);
        for (const end of [segment.a, segment.b]) {
          if (length(point, end) < 0.001) continue;
          rays.add(`${Math.sign(end.x - point.x)}:${Math.sign(end.y - point.y)}`);
        }
      }
      if (rays.size >= 3 && owners.size >= 2)
        result.push({ ...point, wire: group[[...owners][0]].id });
    }
  }
  return result;
}

/** Follow the rendered trunk from its source to a tap, including any crossing arches. */
export function fanOutBranchPath(trunkPath: string, tap: Point, branchPath: string) {
  const parts = pathPoints(trunkPath);
  if (!parts.length) return branchPath;
  const hits = parts.map((points) => closestPathPoint(polylinePath(points), tap));
  const index = hits.reduce((best, hit, i) => (hit.distance < hits[best].distance ? i : best), 0);
  const points = parts[index],
    first = parts[0];
  const start = closestPathPoint(
    polylinePath(points),
    index === 0 ? first[0] : first[first.length - 1],
  );
  const end = hits[index];
  const at = (hit: typeof start) =>
    points.slice(1, hit.index).reduce((sum, point, i) => sum + length(points[i], point), 0) +
    length(points[hit.index - 1], hit.point);
  const section =
    at(start) <= at(end)
      ? [start.point, ...points.slice(start.index, end.index), end.point]
      : [start.point, ...points.slice(end.index, start.index).reverse(), end.point];
  return polylinePath([
    ...(index === 0 ? [] : first),
    ...section,
    ...pathPoints(branchPath).flat(),
  ]);
}

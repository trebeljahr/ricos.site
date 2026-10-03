export type Point = { x: number; y: number };
export type RoutingObstacle = { id: string; x: number; y: number; width: number; height: number };
export type RoutingWire = {
  id: string;
  from: string;
  to: string;
  output: number;
  start: Point;
  end: Point;
};

type Segment = { a: Point; b: Point };

export function simpleWirePath(start: Point, end: Point) {
  if (end.x <= start.x) return wirePath(start, end);
  const bend = Math.min(120, (end.x - start.x) / 2);
  return `M ${start.x} ${start.y} C ${start.x + bend} ${start.y} ${end.x - bend} ${end.y} ${end.x} ${end.y}`;
}

function cleanPoints(points: Point[]) {
  return points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) return true;
    const before = points[index - 1];
    const after = points[index + 1];
    return !(
      (point.x === before.x && point.y === before.y) ||
      (point.x === after.x && point.y === after.y) ||
      (point.x === before.x && point.x === after.x) ||
      (point.y === before.y && point.y === after.y)
    );
  });
}

function roundedPath(raw: Point[]) {
  const points = cleanPoints(raw);
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const before = points[i - 1];
    const corner = points[i];
    const after = points[i + 1];
    const incoming = Math.hypot(corner.x - before.x, corner.y - before.y);
    const outgoing = Math.hypot(after.x - corner.x, after.y - corner.y);
    const radius = Math.min(10, incoming / 2, outgoing / 2);
    const x1 = corner.x - ((corner.x - before.x) / incoming) * radius;
    const y1 = corner.y - ((corner.y - before.y) / incoming) * radius;
    const x2 = corner.x + ((after.x - corner.x) / outgoing) * radius;
    const y2 = corner.y + ((after.y - corner.y) / outgoing) * radius;
    path += ` L ${x1} ${y1} Q ${corner.x} ${corner.y} ${x2} ${y2}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${last.x} ${last.y}`;
}

function segments(points: Point[]): Segment[] {
  return points.slice(1).map((point, index) => ({ a: points[index], b: point }));
}

function obstacleHits(points: Point[], obstacles: Omit<RoutingObstacle, "id">[]) {
  let hits = 0;
  for (const { a, b } of segments(points)) {
    for (const box of obstacles) {
      const left = box.x - 8;
      const right = box.x + box.width + 8;
      const top = box.y - 8;
      const bottom = box.y + box.height + 8;
      if (
        a.y === b.y &&
        a.y > top &&
        a.y < bottom &&
        Math.max(a.x, b.x) > left &&
        Math.min(a.x, b.x) < right
      )
        hits++;
      if (
        a.x === b.x &&
        a.x > left &&
        a.x < right &&
        Math.max(a.y, b.y) > top &&
        Math.min(a.y, b.y) < bottom
      )
        hits++;
    }
  }
  return hits;
}

function wireOverlap(points: Point[], occupied: Segment[]) {
  let cost = 0;
  for (const segment of segments(points)) {
    for (const other of occupied) {
      if (segment.a.y === segment.b.y && other.a.y === other.b.y) {
        const distance = Math.abs(segment.a.y - other.a.y);
        if (distance < 12) {
          const shared =
            Math.min(Math.max(segment.a.x, segment.b.x), Math.max(other.a.x, other.b.x)) -
            Math.max(Math.min(segment.a.x, segment.b.x), Math.min(other.a.x, other.b.x));
          if (shared > 0) cost += shared * (12 - distance);
        }
      } else if (segment.a.x === segment.b.x && other.a.x === other.b.x) {
        const distance = Math.abs(segment.a.x - other.a.x);
        if (distance < 12) {
          const shared =
            Math.min(Math.max(segment.a.y, segment.b.y), Math.max(other.a.y, other.b.y)) -
            Math.max(Math.min(segment.a.y, segment.b.y), Math.min(other.a.y, other.b.y));
          if (shared > 0) cost += shared * (12 - distance);
        }
      }
    }
  }
  return cost;
}

function routePoints(
  start: Point,
  end: Point,
  obstacles: Omit<RoutingObstacle, "id">[],
  occupied: Segment[],
  terminals: Omit<RoutingObstacle, "id">[] = [],
) {
  const gap = end.x - start.x;
  const candidates: Point[][] = [];
  if (gap > 0) {
    const left = start.x + Math.min(24, gap / 2);
    const right = end.x - Math.min(24, gap / 2);
    const step = Math.max(12, (right - left) / 20);
    for (let x = left; x <= right; x += step) {
      candidates.push([start, { x, y: start.y }, { x, y: end.y }, end]);
    }
    if (candidates.at(-1)?.[1].x !== right)
      candidates.push([start, { x: right, y: start.y }, { x: right, y: end.y }, end]);
    if (gap >= 72) {
      for (const offset of [-24, -12, 12, 24]) {
        const laneY = (start.y + end.y) / 2 + offset;
        candidates.push([
          start,
          { x: start.x + 24, y: start.y },
          { x: start.x + 24, y: laneY },
          { x: end.x - 24, y: laneY },
          { x: end.x - 24, y: end.y },
          end,
        ]);
      }
    }
  }
  // A backward wire must leave the output to the right and enter the input from the left.
  // Detour lanes can also rescue forward wires blocked by a part.
  const right = start.x + 28;
  const left = end.x - 28;
  const nearby = [...obstacles, ...terminals].filter(
    (box) =>
      box.x < Math.max(start.x, end.x) + 60 &&
      box.x + box.width > Math.min(start.x, end.x) - 60 &&
      box.y < Math.max(start.y, end.y) + 80 &&
      box.y + box.height > Math.min(start.y, end.y) - 80,
  );
  const top = Math.min(start.y, end.y, ...nearby.map((box) => box.y)) - 28;
  const bottom = Math.max(start.y, end.y, ...nearby.map((box) => box.y + box.height)) + 28;
  for (let offset = 0; offset <= 72; offset += 12) {
    for (const y of [top - offset, bottom + offset]) {
      candidates.push([
        start,
        { x: right, y: start.y },
        { x: right, y },
        { x: left, y },
        { x: left, y: end.y },
        end,
      ]);
    }
  }
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const points = cleanPoints(candidate);
    const length = segments(points).reduce(
      (sum, { a, b }) => sum + Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
      0,
    );
    const score =
      (obstacleHits(points, obstacles) + obstacleHits(points.slice(1, -1), terminals)) * 100000 +
      wireOverlap(points, occupied) * 12 +
      length +
      (points.length - 2) * 8;
    if (score < bestScore) {
      best = points;
      bestScore = score;
    }
  }
  return best;
}

export function wirePath(start: Point, end: Point, obstacles: Omit<RoutingObstacle, "id">[] = []) {
  return roundedPath(routePoints(start, end, obstacles, []));
}

export type RoutedBus = {
  key: string;
  from: string;
  output: number;
  path: string;
  source: Point;
  x: number;
  top: number;
  bottom: number;
  crossings: Point[];
  taps: (Point & { wireId: string })[];
};

export function routeCircuitWires(
  wires: RoutingWire[],
  obstacles: RoutingObstacle[],
  withBuses = false,
) {
  const paths: Record<string, string> = {};
  const buses: RoutedBus[] = [];
  const occupied: Segment[] = [];
  const routedPoints: Point[] = [];
  const bundled = new Set<string>();
  if (withBuses) {
    const groups = new Map<string, RoutingWire[]>();
    for (const wire of wires) {
      if (wire.end.x - wire.start.x < 64) continue;
      const key = `${wire.from}:${wire.output}`;
      groups.set(key, [...(groups.get(key) ?? []), wire]);
    }
    for (const [key, group] of groups) {
      if (group.length < 2) continue;
      const start = group[0].start;
      const maxX = Math.min(...group.map((wire) => wire.end.x)) - 24;
      let bestX: number | null = null;
      let bestHits = Number.POSITIVE_INFINITY;
      let bestScore = Number.POSITIVE_INFINITY;
      const step = Math.max(12, (maxX - start.x - 24) / 20);
      for (let x = start.x + 24; x <= maxX; x += step) {
        const top = Math.min(start.y, ...group.map((wire) => wire.end.y));
        const bottom = Math.max(start.y, ...group.map((wire) => wire.end.y));
        const trunk = [start, { x, y: start.y }, { x, y: top }, { x, y: bottom }];
        const branches = group.map((wire) => [{ x, y: wire.end.y }, wire.end]);
        const hits =
          obstacleHits(
            trunk,
            obstacles.filter((box) => box.id !== group[0].from),
          ) +
          branches.reduce(
            (sum, points, index) =>
              sum +
              obstacleHits(
                points,
                obstacles.filter(
                  (box) => box.id !== group[index].from && box.id !== group[index].to,
                ),
              ),
            0,
          );
        const score =
          hits * 10000000 +
          wireOverlap(trunk, occupied) * 12 +
          branches.reduce((sum, points) => sum + wireOverlap(points, occupied) * 12, 0) +
          Math.abs(x - (start.x + 36));
        if (score < bestScore) {
          bestX = x;
          bestHits = hits;
          bestScore = score;
        }
      }
      if (bestX === null || bestHits > 0) continue;
      const top = Math.min(start.y, ...group.map((wire) => wire.end.y));
      const bottom = Math.max(start.y, ...group.map((wire) => wire.end.y));
      routedPoints.push(start, { x: bestX, y: top }, { x: bestX, y: bottom }, ...group.map((wire) => wire.end));
      const trunk = [start, { x: bestX, y: start.y }];
      // Two subpaths meet at the junction. No vertical retrace or loop.
      const path = `M ${start.x} ${start.y} L ${bestX} ${start.y} M ${bestX} ${top} L ${bestX} ${bottom}`;
      buses.push({
        key,
        from: group[0].from,
        output: group[0].output,
        path,
        source: start,
        x: bestX,
        top,
        bottom,
        crossings: [],
        taps: group.map((wire) => ({ x: bestX!, y: wire.end.y, wireId: wire.id })),
      });
      occupied.push(...segments(trunk), { a: { x: bestX, y: top }, b: { x: bestX, y: bottom } });
      for (const wire of group) {
        const branch = [{ x: bestX, y: wire.end.y }, wire.end];
        paths[wire.id] = `M ${bestX} ${wire.end.y} L ${wire.end.x} ${wire.end.y}`;
        occupied.push(...segments(branch));
        bundled.add(wire.id);
      }
    }
  }
  for (const wire of wires) {
    if (bundled.has(wire.id)) continue;
    const relevant = obstacles.filter((box) => box.id !== wire.from && box.id !== wire.to);
    // Only the connector stubs may touch their own components. Feedback must
    // travel outside both bodies, even when the endpoints sit at similar heights.
    const terminals = obstacles.filter((box) => box.id === wire.from || box.id === wire.to);
    const points = routePoints(wire.start, wire.end, relevant, occupied, terminals);
    routedPoints.push(...points);
    for (const bus of buses) {
      for (const { a, b } of segments(points)) {
        if (
          a.y === b.y &&
          Math.min(a.x, b.x) + 8 < bus.x &&
          bus.x < Math.max(a.x, b.x) - 8 &&
          bus.top + 8 < a.y &&
          a.y < bus.bottom - 8 &&
          !bus.taps.some((tap) => Math.abs(tap.y - a.y) < 10)
        )
          bus.crossings.push({ x: bus.x, y: a.y });
        if (
          a.x === b.x &&
          bus.source.x + 8 < a.x &&
          a.x < bus.x - 8 &&
          Math.min(a.y, b.y) + 8 < bus.source.y &&
          bus.source.y < Math.max(a.y, b.y) - 8
        )
          bus.crossings.push({ x: a.x, y: bus.source.y });
      }
    }
    paths[wire.id] = roundedPath(points);
    occupied.push(...segments(points));
  }
  const bounds = routedPoints.length ? {
    left: Math.min(...routedPoints.map((point) => point.x)),
    top: Math.min(...routedPoints.map((point) => point.y)),
    right: Math.max(...routedPoints.map((point) => point.x)),
    bottom: Math.max(...routedPoints.map((point) => point.y)),
  } : undefined;
  for (const bus of buses) {
    const seen = new Set<string>();
    bus.crossings = bus.crossings.filter((point) => {
      const key = `${point.x}:${point.y}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return { paths, buses, bounds };
}

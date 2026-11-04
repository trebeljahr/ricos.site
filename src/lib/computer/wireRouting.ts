export type Point = { x: number; y: number };
export type RoutingObstacle = { id: string; x: number; y: number; width: number; height: number };
export type PortSide = "left" | "top" | "right" | "bottom";
export type RoutingWire = {
  id: string;
  from: string;
  to: string;
  output: number;
  start: Point;
  end: Point;
  startSide?: PortSide;
  endSide?: PortSide;
  net?: string;
  /** Authored routes take part in obstacle avoidance without being rearranged. */
  points?: Point[];
};

type Segment = { a: Point; b: Point; net?: string };

/** Past this gap two segments cost nothing, so a search never looks further. */
const CONFLICT_RANGE = 12;
const CELL_SIZE = 128;

const MAX_CELLS = 4096;

const cellKey = (column: number, row: number) => column * 0x200000 + row;

function cellArea({ a, b }: Segment, margin: number) {
  const left = Math.floor((Math.min(a.x, b.x) - margin) / CELL_SIZE);
  const right = Math.floor((Math.max(a.x, b.x) + margin) / CELL_SIZE);
  const top = Math.floor((Math.min(a.y, b.y) - margin) / CELL_SIZE);
  const bottom = Math.floor((Math.max(a.y, b.y) + margin) / CELL_SIZE);
  return { left, right, top, bottom, cells: (right - left + 1) * (bottom - top + 1) };
}

/**
 * The wires routed so far, in a coarse grid. A big board has thousands of
 * segments, and each candidate route only ever comes near a few of them.
 */
class Occupancy {
  readonly segments: Segment[] = [];
  private readonly cells = new Map<number, number[]>();
  /** Segments too long for cells, so a part dropped far away costs no memory. */
  private readonly wide: number[] = [];
  private readonly seen: number[] = [];
  private query = 0;

  add(segment: Segment) {
    const index = this.segments.length;
    this.segments.push(segment);
    this.seen.push(0);
    const area = cellArea(segment, CONFLICT_RANGE);
    if (area.cells > MAX_CELLS) {
      this.wide.push(index);
      return;
    }
    for (let column = area.left; column <= area.right; column++) {
      for (let row = area.top; row <= area.bottom; row++) {
        const key = cellKey(column, row);
        const cell = this.cells.get(key);
        if (cell) cell.push(index);
        else this.cells.set(key, [index]);
      }
    }
  }

  /** Segments that may lie within range of this one, oldest first, so a sum adds up the same. */
  near(segment: Segment, found: number[]) {
    found.length = 0;
    const area = cellArea(segment, 0);
    if (area.cells > MAX_CELLS) {
      for (let index = 0; index < this.segments.length; index++) found.push(index);
      return found;
    }
    const query = ++this.query;
    for (const index of this.wide) {
      this.seen[index] = query;
      found.push(index);
    }
    for (let column = area.left; column <= area.right; column++) {
      for (let row = area.top; row <= area.bottom; row++) {
        const cell = this.cells.get(cellKey(column, row));
        if (!cell) continue;
        for (const index of cell) {
          if (this.seen[index] === query) continue;
          this.seen[index] = query;
          found.push(index);
        }
      }
    }
    return found.sort((left, right) => left - right);
  }
}

const NOTHING_OCCUPIED = new Occupancy();
const nearby: number[] = [];

export function simpleWirePath(start: Point, end: Point) {
  if (end.x <= start.x) return wirePath(start, end);
  const bend = Math.min(120, (end.x - start.x) / 2);
  return `M ${start.x} ${start.y} C ${start.x + bend} ${start.y} ${end.x - bend} ${end.y} ${end.x} ${end.y}`;
}

function cleanPoints(points: Point[]) {
  const result: Point[] = [];
  for (const point of points) {
    const last = result[result.length - 1];
    if (last && point.x === last.x && point.y === last.y) continue;
    while (result.length >= 2) {
      const a = result[result.length - 2],
        b = result[result.length - 1];
      // Only collapse a straight continuation. A reversal is a routing defect.
      if (
        (b.x - a.x) * (point.y - b.y) !== (b.y - a.y) * (point.x - b.x) ||
        (b.x - a.x) * (point.x - b.x) + (b.y - a.y) * (point.y - b.y) <= 0
      )
        break;
      result.pop();
    }
    result.push(point);
  }
  return result;
}

const sideVector = (side: PortSide): Point =>
  ({
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    top: { x: 0, y: -1 },
    bottom: { x: 0, y: 1 },
  })[side];

/** Route fixed ports using their actual outward directions, with shared clearance lanes. */
function orientedRoutePoints(
  start: Point,
  end: Point,
  startSide: PortSide,
  endSide: PortSide,
  obstacles: Omit<RoutingObstacle, "id">[],
  occupied: Occupancy,
  ownNet: string | undefined,
  terminals: Omit<RoutingObstacle, "id">[],
) {
  const from = sideVector(startSide),
    to = sideVector(endSide);
  const facingGap = (end.x - start.x) * from.x + (end.y - start.y) * from.y;
  const stub =
    from.x === -to.x && from.y === -to.y && facingGap > 0 ? Math.min(24, facingGap / 2) : 24;
  const exit = { x: start.x + from.x * stub, y: start.y + from.y * stub };
  const entry = { x: end.x + to.x * stub, y: end.y + to.y * stub };
  const xs = new Set([
    exit.x,
    entry.x,
    (exit.x + entry.x) / 2,
    Math.min(exit.x, entry.x) - 24,
    Math.max(exit.x, entry.x) + 24,
  ]);
  const ys = new Set([
    exit.y,
    entry.y,
    (exit.y + entry.y) / 2,
    Math.min(exit.y, entry.y) - 24,
    Math.max(exit.y, entry.y) + 24,
  ]);
  // Exact obstacle edges and occupied lanes avoid coarse-grid near misses.
  for (const box of [...obstacles, ...terminals]) {
    xs.add(box.x - 24);
    xs.add(box.x + box.width + 24);
    ys.add(box.y - 24);
    ys.add(box.y + box.height + 24);
  }
  for (const { a, b, net } of occupied.segments) {
    if (ownNet && net === ownNet) continue;
    if (a.x === b.x) {
      xs.add(a.x - 16);
      xs.add(a.x + 16);
    }
    if (a.y === b.y) {
      ys.add(a.y - 16);
      ys.add(a.y + 16);
    }
  }
  const candidates: Point[][] = [
    [start, exit, { x: entry.x, y: exit.y }, entry, end],
    [start, exit, { x: exit.x, y: entry.y }, entry, end],
  ];
  for (const x of xs)
    candidates.push([start, exit, { x, y: exit.y }, { x, y: entry.y }, entry, end]);
  for (const y of ys)
    candidates.push([start, exit, { x: exit.x, y }, { x: entry.x, y }, entry, end]);
  let best: Point[] = candidates[0],
    bestScore = Infinity;
  for (const candidate of candidates) {
    const points = cleanPoints(candidate);
    // Reject U-turns instead of smoothing them into little loops at a pin.
    if (
      points.some((b, i) => {
        if (!i || i === points.length - 1) return false;
        const a = points[i - 1],
          c = points[i + 1];
        return (b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y) < 0;
      })
    )
      continue;
    const length = segments(points).reduce(
      (sum, { a, b }) => sum + Math.abs(a.x - b.x) + Math.abs(a.y - b.y),
      0,
    );
    const hits = obstacleHits(points, obstacles) + obstacleHits(candidate.slice(1, -1), terminals);
    const score =
      hits * 100000 +
      wireConflictCost(points, occupied, ownNet) * 12 +
      length +
      (points.length - 2) * 16;
    if (score < bestScore) {
      best = points;
      bestScore = score;
    }
  }
  return best;
}

/** Port-aware preview, also used while dragging an individual endpoint. */
export function orientedWirePath(start: Point, end: Point, startSide: PortSide, endSide: PortSide) {
  return roundedPath(
    orientedRoutePoints(start, end, startSide, endSide, [], NOTHING_OCCUPIED, undefined, []),
  );
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

/** Parallel overlap, crossings and near misses against wires on other nets than `ownNet`. */
function wireConflictCost(points: Point[], occupied: Occupancy, ownNet?: string) {
  let cost = 0;
  const first = points[0],
    last = points[points.length - 1];
  const touches = (point: Point, { a, b }: Segment) =>
    (a.x === point.x && a.y === point.y) || (b.x === point.x && b.y === point.y);
  for (const segment of segments(points)) {
    const segmentLeft = Math.min(segment.a.x, segment.b.x),
      segmentRight = Math.max(segment.a.x, segment.b.x),
      segmentTop = Math.min(segment.a.y, segment.b.y),
      segmentBottom = Math.max(segment.a.y, segment.b.y);
    for (const index of occupied.near(segment, nearby)) {
      const other = occupied.segments[index];
      if (ownNet && other.net === ownNet) continue;
      const otherLeft = Math.min(other.a.x, other.b.x),
        otherRight = Math.max(other.a.x, other.b.x),
        otherTop = Math.min(other.a.y, other.b.y),
        otherBottom = Math.max(other.a.y, other.b.y);
      const gapX = Math.max(0, segmentLeft - otherRight, otherLeft - segmentRight);
      const gapY = Math.max(0, segmentTop - otherBottom, otherTop - segmentBottom);
      if (gapX >= CONFLICT_RANGE || gapY >= CONFLICT_RANGE) continue;
      if (segment.a.y === segment.b.y && other.a.y === other.b.y) {
        const distance = Math.abs(segment.a.y - other.a.y);
        if (distance < 12) {
          const shared = Math.min(segmentRight, otherRight) - Math.max(segmentLeft, otherLeft);
          if (shared > 0) cost += shared * (12 - distance);
        }
      } else if (segment.a.x === segment.b.x && other.a.x === other.b.x) {
        const distance = Math.abs(segment.a.x - other.a.x);
        if (distance < 12) {
          const shared = Math.min(segmentBottom, otherBottom) - Math.max(segmentTop, otherTop);
          if (shared > 0) cost += shared * (12 - distance);
        }
      }
      // Fan-out wires may share a terminal. Charge for the shared run above,
      // but do not count that unavoidable junction as a crossing at each bend.
      const sharedTerminal =
        (touches(first, segment) && touches(first, other)) ||
        (touches(last, segment) && touches(last, other));
      if (sharedTerminal) continue;
      // Perpendicular crossings and near misses matter too, including touches
      // at bends. Parallel overlap alone allows a lane to cut through a stack.
      const distance = Math.hypot(gapX, gapY);
      if (distance < 12) cost += (12 - distance) * 12;
      if (distance === 0) cost += 200;
    }
  }
  return cost;
}

function routePoints(
  start: Point,
  end: Point,
  obstacles: Omit<RoutingObstacle, "id">[],
  occupied: Occupancy,
  ownNet?: string,
  terminals: Omit<RoutingObstacle, "id">[] = [],
) {
  const gap = end.x - start.x;
  const candidates: Point[][] = [];
  if (gap > 0) {
    const left = start.x + Math.min(24, gap / 2);
    const right = end.x - Math.min(24, gap / 2);
    const step = Math.max(12, (right - left) / 20);
    const lanes = new Set([left, right]);
    for (let x = left; x <= right; x += step) {
      lanes.add(x);
    }
    // Include exact clearance lanes; a coarse grid can miss available space.
    for (const { a, b, net } of occupied.segments) {
      if (a.x !== b.x || (ownNet && net === ownNet)) continue;
      for (const x of [a.x - 12, a.x + 12]) {
        if (left <= x && x <= right) lanes.add(x);
      }
    }
    for (const x of [...lanes].sort((a, b) => a - b)) {
      candidates.push([start, { x, y: start.y }, { x, y: end.y }, end]);
    }
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
      wireConflictCost(points, occupied, ownNet) * 12 +
      length +
      (points.length - 2) * 8;
    if (score < bestScore - 1e-7) {
      best = points;
      bestScore = score;
    }
  }
  return best;
}

export function wirePath(start: Point, end: Point, obstacles: Omit<RoutingObstacle, "id">[] = []) {
  return roundedPath(routePoints(start, end, obstacles, NOTHING_OCCUPIED));
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
  const occupied = new Occupancy();
  const occupy = (points: Point[], net?: string) => {
    for (const segment of segments(points)) occupied.add({ ...segment, net });
  };
  const routedPoints: Point[] = [];
  const bundled = new Set<string>();
  for (const wire of wires) {
    if (!wire.points) continue;
    paths[wire.id] = wire.points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
    routedPoints.push(...wire.points);
    occupy(wire.points, wire.net);
    bundled.add(wire.id);
  }
  // Route the outside of each fan first: top to bottom for upward wires,
  // bottom to top for downward wires. Creation order can trap later wires
  // behind an earlier bend, even when a shortest, crossing-free fan exists.
  const orderedWires = [...wires].sort((a, b) => {
    const directionA = Math.sign(a.end.y - a.start.y);
    const directionB = Math.sign(b.end.y - b.start.y);
    return (
      directionA - directionB ||
      a.start.x - b.start.x ||
      (a.start.y - b.start.y) * (directionA > 0 ? -1 : 1) ||
      a.end.x - b.end.x ||
      a.end.y - b.end.y ||
      a.id.localeCompare(b.id)
    );
  });
  if (withBuses) {
    const groups = new Map<string, RoutingWire[]>();
    for (const wire of orderedWires) {
      if (
        wire.points ||
        (wire.startSide ?? "right") !== "right" ||
        (wire.endSide ?? "left") !== "left" ||
        wire.end.x - wire.start.x < 64
      )
        continue;
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
          wireConflictCost(trunk, occupied) * 12 +
          branches.reduce((sum, points) => sum + wireConflictCost(points, occupied) * 12, 0) +
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
      routedPoints.push(
        start,
        { x: bestX, y: top },
        { x: bestX, y: bottom },
        ...group.map((wire) => wire.end),
      );
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
      occupy(trunk, group[0].net);
      occupied.add({ a: { x: bestX, y: top }, b: { x: bestX, y: bottom }, net: group[0].net });
      for (const wire of group) {
        const branch = [{ x: bestX, y: wire.end.y }, wire.end];
        paths[wire.id] = `M ${bestX} ${wire.end.y} L ${wire.end.x} ${wire.end.y}`;
        occupy(branch, wire.net);
        bundled.add(wire.id);
      }
    }
  }
  for (const wire of orderedWires) {
    if (bundled.has(wire.id)) continue;
    const relevant = obstacles.filter((box) => box.id !== wire.from && box.id !== wire.to);
    // Only the connector stubs may touch their own components. Feedback must
    // travel outside both bodies, even when the endpoints sit at similar heights.
    const terminals = obstacles.filter((box) => box.id === wire.from || box.id === wire.to);
    const startSide = wire.startSide ?? "right",
      endSide = wire.endSide ?? "left";
    const points =
      startSide === "right" && endSide === "left"
        ? routePoints(wire.start, wire.end, relevant, occupied, wire.net, terminals)
        : orientedRoutePoints(
            wire.start,
            wire.end,
            startSide,
            endSide,
            relevant,
            occupied,
            wire.net,
            terminals,
          );
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
    occupy(points, wire.net);
  }
  const bounds = routedPoints.length
    ? {
        left: Math.min(...routedPoints.map((point) => point.x)),
        top: Math.min(...routedPoints.map((point) => point.y)),
        right: Math.max(...routedPoints.map((point) => point.x)),
        bottom: Math.max(...routedPoints.map((point) => point.y)),
      }
    : undefined;
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

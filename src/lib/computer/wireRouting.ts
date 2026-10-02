type Point = { x: number; y: number };
type Obstacle = { x: number; y: number; width: number; height: number };

function roundedPath(points: Point[]) {
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const before = points[i - 1];
    const corner = points[i];
    const after = points[i + 1];
    const incoming = Math.hypot(corner.x - before.x, corner.y - before.y);
    const outgoing = Math.hypot(after.x - corner.x, after.y - corner.y);
    if (!incoming || !outgoing) continue;
    const radius = Math.min(12, incoming / 2, outgoing / 2);
    const x1 = corner.x - ((corner.x - before.x) / incoming) * radius;
    const y1 = corner.y - ((corner.y - before.y) / incoming) * radius;
    const x2 = corner.x + ((after.x - corner.x) / outgoing) * radius;
    const y2 = corner.y + ((after.y - corner.y) / outgoing) * radius;
    path += ` L ${x1} ${y1} Q ${corner.x} ${corner.y} ${x2} ${y2}`;
  }
  const last = points[points.length - 1];
  return `${path} L ${last.x} ${last.y}`;
}

function crosses(points: Point[], obstacles: Obstacle[]) {
  let hits = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
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

export function wirePath(start: Point, end: Point, obstacles: Obstacle[] = [], laneOffset = 0) {
  const gap = end.x - start.x;
  if (gap >= 72) {
    const preferred = Math.max(start.x + 28, Math.min(end.x - 28, start.x + gap / 2 + laneOffset));
    const candidates = [
      preferred,
      preferred - 24,
      preferred + 24,
      preferred - 48,
      preferred + 48,
      start.x + 28,
      end.x - 28,
    ].map((x) => Math.max(start.x + 28, Math.min(end.x - 28, x)));
    let best = candidates[0];
    let score = Number.POSITIVE_INFINITY;
    for (const x of candidates) {
      const points = [start, { x, y: start.y }, { x, y: end.y }, end];
      const next = crosses(points, obstacles) * 1000 + Math.abs(x - preferred);
      if (next < score) {
        best = x;
        score = next;
      }
    }
    return roundedPath([start, { x: best, y: start.y }, { x: best, y: end.y }, end]);
  }
  const above = Math.max(18, Math.min(start.y, end.y) - 48 - Math.abs(laneOffset));
  const below = Math.min(502, Math.max(start.y, end.y) + 48 + Math.abs(laneOffset));
  const left = end.x - 34;
  const right = start.x + 34;
  const candidates = [above, below];
  const laneY = candidates.reduce((best, y) => {
    const route = [
      start,
      { x: right, y: start.y },
      { x: right, y },
      { x: left, y },
      { x: left, y: end.y },
      end,
    ];
    const bestRoute = [
      start,
      { x: right, y: start.y },
      { x: right, y: best },
      { x: left, y: best },
      { x: left, y: end.y },
      end,
    ];
    return crosses(route, obstacles) < crosses(bestRoute, obstacles) ? y : best;
  });
  return roundedPath([
    start,
    { x: right, y: start.y },
    { x: right, y: laneY },
    { x: left, y: laneY },
    { x: left, y: end.y },
    end,
  ]);
}

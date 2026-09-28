export type Vec = [x: number, y: number];
export type Bezier = [Vec, Vec, Vec, Vec];

export const distance = (a: Vec, b: Vec) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * Evens out the small wobbles of a hand-traced route before it is drawn:
 * Taubin smoothing, a shrink step towards the neighbours and an inflate step
 * away from them, so the bends soften while loops keep their size. Points
 * marked `pinned` (where the trail leaves the window) and their neighbours
 * stay put.
 */
export function soften(points: Vec[], pinned: boolean[], passes: number): Vec[] {
  let current = points.map((p) => [...p] as Vec);
  const free = points.map(
    (_, i) => i > 1 && i < points.length - 2 && !pinned[i - 1] && !pinned[i] && !pinned[i + 1],
  );
  for (let pass = 0; pass < passes; pass++) {
    for (const factor of [0.5, -0.53]) {
      current = current.map((p, i) =>
        free[i]
          ? ([0, 1].map(
              (k) => p[k] + factor * ((current[i - 1][k] + current[i + 1][k]) / 2 - p[k]),
            ) as Vec)
          : p,
      );
    }
  }
  return current;
}

/**
 * Centripetal Catmull-Rom through the waypoints, as cubic Béziers. It passes
 * through every waypoint and, unlike the uniform kind, makes no kinks or
 * stray loops where waypoints sit close together.
 */
export function smoothCurve(points: Vec[]): Bezier[] {
  const n = points.length;
  const mirror = (a: Vec, b: Vec): Vec => [2 * a[0] - b[0], 2 * a[1] - b[1]];
  const at = (i: number) =>
    i < 0
      ? mirror(points[0], points[1])
      : i >= n
        ? mirror(points[n - 1], points[n - 2])
        : points[i];

  const segments: Bezier[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const d1 = Math.max(Math.sqrt(distance(p0, p1)), 1e-3);
    const d2 = Math.max(Math.sqrt(distance(p1, p2)), 1e-3);
    const d3 = Math.max(Math.sqrt(distance(p2, p3)), 1e-3);
    const c1 = [0, 1].map(
      (k) =>
        (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) /
        (3 * d1 * (d1 + d2)),
    ) as Vec;
    const c2 = [0, 1].map(
      (k) =>
        (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) /
        (3 * d3 * (d3 + d2)),
    ) as Vec;
    segments.push([p1, c1, c2, p2]);
  }
  return segments;
}

/** Walks the curve and drops a point every `spacing` px along it. */
export function dotsAlong(segments: Bezier[], spacing: number): Vec[] {
  const dots: Vec[] = [];
  let carried = spacing;
  let last = segments[0][0];
  for (const [p0, c1, c2, p1] of segments) {
    for (let step = 1; step <= 40; step++) {
      const t = step / 40;
      const u = 1 - t;
      const next: Vec = [0, 1].map(
        (k) =>
          u * u * u * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * p1[k],
      ) as Vec;
      let length = distance(last, next);
      while (carried <= length) {
        const f = carried / length;
        last = [last[0] + (next[0] - last[0]) * f, last[1] + (next[1] - last[1]) * f];
        dots.push(last);
        length -= carried;
        carried = spacing;
      }
      carried -= length;
      last = next;
    }
  }
  return dots;
}

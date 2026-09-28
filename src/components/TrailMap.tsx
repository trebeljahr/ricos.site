import clsx from "clsx";
import { type ReactNode, useEffect, useRef, useState } from "react";

/*
 * The top of /start-here drawn as an old map: a dotted trail that winds around
 * the title, the photo and the text, a compass rose in a corner, an X inside
 * one loop of the trail and a few wave marks out at sea. It is decoration only:
 * aria-hidden, no pointer events, and nothing until the client has measured.
 *
 * The trail is laid out in pixels, not stretched: the route is a list of
 * waypoints that the client places against the layout it wraps, joins with a
 * smooth curve and then walks, putting a dot every SPACING px. So dots stay
 * round, the spacing stays even, and the route keeps its relation to the
 * content at any width:
 *   - x is in widths of the page column (0 its left edge, 1 its right; LEFT and
 *     RIGHT are the window edges). Negative values and values over 1 lie out in
 *     the margins, and simply leave the window when the margins are narrow.
 *   - y is on RULERS, horizontal lines measured from the page: 0 the top of the
 *     wrapper, 1 and 2 the top and bottom of the photo, 3 the bottom of the
 *     section and 4 BELOW px under it. 1.5 is halfway down the photo.
 * Dots over a line of text are dimmed, so the trail never gets in the way of
 * reading. The markers each list the spots they may stand on and take the
 * first one that is on screen and clear of text, photo and trail, or stay
 * away.
 *
 * Drawing in: every dot fades in at the moment a pen moving along the trail
 * reaches it (animation-delay per dot), and each marker when the pen has
 * passed it. The CSS is .trail-map-draw in globals.css; with reduced motion
 * the whole map is simply there.
 */

type Point = readonly [x: number, y: number];
type Vec = [x: number, y: number];

const LEFT = -Infinity;
const RIGHT = Infinity;

const SPACING = 13;
const DOT_RADIUS = 1.5;
const DIMMED = 0.3;
const BELOW = 80;
/** Where the trail starts and ends, outside the window so it runs off the map. */
const OFF_EDGE = 24;

/** The pen: when it starts, and how long it takes for the whole trail. */
const PEN_START_MS = 900;
const PEN_MS = 4200;

// Desktop (md+): traced from a sketch. The trail comes in low on the left,
// climbs the margin with a loop beside the photo, runs over the title, dips
// down beside it, ties a loop to the right of the subtitle and comes down
// past the end of the text to leave on the right.
const WIDE_TRAIL: Point[] = [
  [LEFT, 1.9],
  [-0.188, 1.868],
  [-0.152, 1.803],
  [-0.132, 1.712],
  [-0.117, 1.598],
  [-0.107, 1.492],
  [-0.103, 1.41],
  [-0.116, 1.367],
  [-0.146, 1.332],
  [-0.159, 1.264],
  [-0.152, 1.203],
  [-0.13, 1.165],
  [-0.105, 1.139],
  [-0.076, 1.127],
  [-0.052, 1.146],
  [-0.054, 1.178],
  [-0.076, 1.193],
  [-0.1, 1.176],
  [-0.11, 1.131],
  [-0.112, 1.036],
  [-0.112, 0.746],
  [-0.11, 0.562],
  [-0.091, 0.428],
  [-0.043, 0.355],
  [0.029, 0.318],
  [0.116, 0.268],
  [0.181, 0.227],
  [0.246, 0.237],
  [0.304, 0.318],
  [0.335, 0.411],
  [0.342, 0.545],
  [0.37, 0.612],
  [0.413, 0.605],
  [0.448, 0.528],
  [0.457, 0.395],
  [0.486, 0.288],
  [0.543, 0.241],
  [0.616, 0.224],
  [0.67, 0.227],
  [0.686, 0.361],
  [0.688, 0.579],
  [0.678, 0.813],
  [0.652, 0.98],
  [0.609, 1.03],
  [0.569, 1.029],
  [0.549, 0.963],
  [0.558, 0.819],
  [0.591, 0.746],
  [0.634, 0.759],
  [0.681, 0.863],
  [0.739, 1.024],
  [0.797, 1.085],
  [0.862, 1.1],
  [0.909, 1.124],
  [0.937, 1.203],
  [0.948, 1.324],
  [0.938, 1.46],
  [0.924, 1.582],
  [0.931, 1.688],
  [0.964, 1.764],
  [1.022, 1.81],
  [1.116, 1.818],
  [RIGHT, 1.813],
];

// Mobile: one column, photo above the text. Over the title, a loop in the gap
// after the short last line of the subtitle, then off the map on the right
// past the photo and the text, and back in underneath them.
const NARROW_TRAIL: Point[] = [
  [LEFT, 0.3],
  [0.1, 0.29],
  [0.3, 0.27],
  [0.5, 0.29],
  [0.66, 0.35],
  [0.745, 0.49],
  [0.75, 0.66],
  [0.73, 0.8],
  [0.66, 0.94],
  [0.55, 0.975],
  [0.46, 0.9],
  [0.48, 0.79],
  [0.58, 0.735],
  [0.68, 0.76],
  [0.8, 0.84],
  [0.9, 0.92],
  [RIGHT, 0.98],
  [RIGHT, 3.05],
  [0.86, 3.3],
  [0.62, 3.5],
  [0.38, 3.36],
  [0.14, 3.45],
  [LEFT, 3.62],
];

type MarkKind = "compass" | "x" | "waves";

/** A spot on the route's grid, nudged by dx/dy px. */
type Spot = { at: Point; dx?: number; dy?: number };

/** A marker takes the first of its spots that fits. */
type Mark = { kind: MarkKind; spots: Spot[] };

const WIDE_MARKS: Mark[] = [
  // Top left, above the corner the trail turns at; top right when the margin
  // is too narrow for it.
  {
    kind: "compass",
    spots: [{ at: [-0.091, 0.428], dx: -64, dy: -62 }, { at: [0.9, 0.35] }],
  },
  // Inside the loop beside the subtitle.
  { kind: "x", spots: [{ at: [0.605, 0.89] }] },
  // Sea in the margins, more of it the wider the window.
  { kind: "waves", spots: [{ at: [-0.19, 1.55] }] },
  { kind: "waves", spots: [{ at: [1.08, 1.4] }] },
  { kind: "waves", spots: [{ at: [-0.32, 1.25] }] },
  { kind: "waves", spots: [{ at: [1.24, 1.62] }] },
];

const NARROW_MARKS: Mark[] = [
  { kind: "compass", spots: [{ at: [0.86, 0.2] }] },
  { kind: "x", spots: [{ at: [0.6, 0.855] }] },
];

type Size = { r: number; clear: number };

/** r: radius the marker takes up. clear: how far the trail has to stay away from its centre. */
const SIZES: Record<"wide" | "narrow", Record<MarkKind, Size>> = {
  wide: {
    compass: { r: 56, clear: 60 },
    x: { r: 9, clear: 16 },
    waves: { r: 20, clear: 34 },
  },
  narrow: {
    compass: { r: 37, clear: 42 },
    x: { r: 8, clear: 14 },
    waves: { r: 18, clear: 30 },
  },
};

type Dot = { x: number; y: number; delay: number; dim: boolean };
type Placed = { kind: MarkKind; x: number; y: number; delay: number };
type TrailMapLayout = {
  width: number;
  height: number;
  compassRadius: number;
  dots: Dot[];
  marks: Placed[];
};
type Box = { left: number; top: number; right: number; bottom: number };

const onRulers = (v: number, rulers: number[]) => {
  const i = Math.min(Math.max(Math.floor(v), 0), rulers.length - 2);
  return rulers[i] + (v - i) * (rulers[i + 1] - rulers[i]);
};

const distance = (a: Vec, b: Vec) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * Centripetal Catmull-Rom through the waypoints, as cubic Béziers. It passes
 * through every waypoint and, unlike the uniform kind, makes no kinks or
 * stray loops where waypoints sit close together.
 */
function smoothCurve(points: Vec[]): [Vec, Vec, Vec, Vec][] {
  const n = points.length;
  const mirror = (a: Vec, b: Vec): Vec => [2 * a[0] - b[0], 2 * a[1] - b[1]];
  const at = (i: number) =>
    i < 0
      ? mirror(points[0], points[1])
      : i >= n
        ? mirror(points[n - 1], points[n - 2])
        : points[i];

  const segments: [Vec, Vec, Vec, Vec][] = [];
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
function dotsAlong(segments: [Vec, Vec, Vec, Vec][], spacing: number): Vec[] {
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

const inside = ([x, y]: Vec, box: Box, pad: number) =>
  x > box.left - pad && x < box.right + pad && y > box.top - pad && y < box.bottom + pad;

/** Lays out the map against the current page, in px relative to the map box. */
function layOut(wrapper: HTMLElement, mapBox: HTMLElement): TrailMapLayout | null {
  const section = wrapper.querySelector("section");
  const photo = wrapper.querySelector("[data-trail-photo]");
  if (!section || !photo) return null;

  const origin = mapBox.getBoundingClientRect();
  const local = (r: DOMRect): Box => ({
    left: r.left - origin.left,
    top: r.top - origin.top,
    right: r.right - origin.left,
    bottom: r.bottom - origin.top,
  });
  const column = local(wrapper.getBoundingClientRect());
  const photoBox = local(photo.getBoundingClientRect());
  const sectionBox = local(section.getBoundingClientRect());
  const rulers = [
    column.top,
    photoBox.top,
    photoBox.bottom,
    sectionBox.bottom,
    sectionBox.bottom + BELOW,
  ];

  // Every line of text in the wrapper, as its own box.
  const lines: Box[] = [];
  const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || mapBox.contains(node)) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) lines.push(local(rect));
  }

  const wide = window.matchMedia("(min-width: 48rem)").matches;
  const width = origin.width;
  const height = origin.height;
  const toPx = ([x, y]: Point): Vec => [
    x === LEFT
      ? -OFF_EDGE
      : x === RIGHT
        ? width + OFF_EDGE
        : column.left + x * (column.right - column.left),
    onRulers(y, rulers),
  ];

  // Where the trail crosses itself, keep one of two dots that would clump.
  const points = dotsAlong(
    smoothCurve((wide ? WIDE_TRAIL : NARROW_TRAIL).map(toPx)),
    SPACING,
  ).filter(
    (p, i, all) => !all.slice(0, Math.max(i - 3, 0)).some((q) => distance(p, q) < SPACING * 0.6),
  );
  // The pen speeds up and slows down like a hand drawing a line (sine in-out).
  const penAt = (i: number) =>
    Math.round(PEN_START_MS + (PEN_MS * Math.acos(1 - (2 * i) / (points.length - 1))) / Math.PI);
  const dots = points.map(([x, y], i) => ({
    x,
    y,
    delay: penAt(i),
    dim: lines.some((line) => inside([x, y], line, 3)),
  }));

  const sizes = SIZES[wide ? "wide" : "narrow"];
  const blocked = [...lines, photoBox];
  const marks: Placed[] = [];
  for (const mark of wide ? WIDE_MARKS : NARROW_MARKS) {
    const { r, clear } = sizes[mark.kind];
    const fit = mark.spots
      .map(({ at, dx = 0, dy = 0 }): Vec => {
        const [x, y] = toPx(at);
        return [x + dx, y + dy];
      })
      .find(
        (c) =>
          c[0] - r > 8 &&
          c[0] + r < width - 8 &&
          c[1] - r > 0 &&
          c[1] + r < height &&
          !blocked.some((b) => inside(c, b, r + 8)) &&
          !points.some((p) => distance(p, c) < clear),
      );
    if (!fit) continue;
    // The compass is there first; everything else once the pen has been by.
    let delay = 300;
    if (mark.kind !== "compass") {
      let last = -1;
      points.forEach((p, i) => {
        if (distance(p, fit) < clear + 60) last = i;
      });
      delay = last < 0 ? PEN_START_MS + PEN_MS : penAt(last) + 150;
    }
    marks.push({ kind: mark.kind, x: fit[0], y: fit[1], delay });
  }

  return { width, height, compassRadius: sizes.compass.r, dots, marks };
}

const CARDINALS = [0, 90, 180, 270];
const DIAGONALS = [45, 135, 225, 315];

/** An eight-point compass rose. The star swings in and settles on north like a needle. */
const Compass = ({ r, delay }: { r: number; delay: number }) => {
  const tick = (angle: number, from: number, to: number) => {
    const rad = (angle * Math.PI) / 180;
    return `M ${from * Math.sin(rad)} ${-from * Math.cos(rad)} L ${to * Math.sin(rad)} ${-to * Math.cos(rad)}`;
  };
  // One point of the star, split down the middle: one half filled, one outlined.
  const point = (angle: number, length: number, half: number) => (
    <g key={angle} transform={`rotate(${angle})`}>
      <path d={`M 0 ${-length} L ${half} ${-half} L 0 0 Z`} fill="currentColor" />
      <path d={`M 0 ${-length} L ${-half} ${-half} L 0 0 Z`} fill="none" />
    </g>
  );
  return (
    <g stroke="currentColor" strokeLinejoin="round">
      <g className="trail-fade" style={{ animationDelay: `${delay}ms` }} fill="none">
        <circle r={r * 0.66} strokeWidth={1.25} />
        <circle r={r * 0.58} strokeWidth={0.75} />
        <path
          d={Array.from({ length: 32 }, (_, i) =>
            tick(i * 11.25, r * 0.58, r * (i % 4 === 0 ? 0.66 : 0.62)),
          ).join(" ")}
          strokeWidth={0.75}
        />
        <text
          y={-r * 0.74}
          textAnchor="middle"
          stroke="none"
          fill="currentColor"
          className="font-serif italic"
          fontSize={r * 0.29}
        >
          N
        </text>
      </g>
      <g className="trail-needle" style={{ animationDelay: `${delay}ms` }} strokeWidth={0.9}>
        {DIAGONALS.map((angle) => point(angle, r * 0.4, r * 0.072))}
        {CARDINALS.map((angle) => point(angle, r * 0.63, r * 0.105))}
        <circle r={r * 0.05} fill="currentColor" stroke="none" />
      </g>
    </g>
  );
};

const Marker = ({ mark, compassRadius }: { mark: Placed; compassRadius: number }) => {
  const style = { animationDelay: `${mark.delay}ms` };
  return (
    <g transform={`translate(${mark.x.toFixed(1)} ${mark.y.toFixed(1)})`}>
      {mark.kind === "compass" && <Compass r={compassRadius} delay={mark.delay} />}
      {mark.kind === "x" && (
        <path
          className="trail-stamp"
          style={style}
          d="M -6 -6.5 L 6.5 6 M 6 -6.5 L -6 6"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      )}
      {mark.kind === "waves" && (
        <path
          className="trail-fade"
          style={style}
          d="M -18 -3 q 4.5 -4 9 0 t 9 0 t 9 0 t 9 0 M -9 6 q 4.5 -4 9 0 t 9 0 t 9 0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
        />
      )}
    </g>
  );
};

/**
 * Wraps the top of the page (header and intro section) and draws the map
 * behind it. The section's photo needs `data-trail-photo`: its top and bottom
 * are rulers the route is laid out on.
 */
export const TrailMap = ({ children }: { children: ReactNode }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<TrailMapLayout | null>(null);
  // Only the first layout draws itself in; after a resize the map is just there.
  const [drawing, setDrawing] = useState(true);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const map = mapRef.current;
    if (!wrapper || !map) return;
    const update = () => setLayout(layOut(wrapper, map));
    // The map box follows the window, the wrapper follows the text.
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    observer.observe(map);
    const done = window.setTimeout(() => setDrawing(false), PEN_START_MS + PEN_MS + 1000);
    return () => {
      observer.disconnect();
      window.clearTimeout(done);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative isolate">
      <div
        ref={mapRef}
        aria-hidden="true"
        className={clsx(
          "pointer-events-none absolute -top-8 -bottom-20 left-1/2 -z-10 w-screen -translate-x-1/2 text-gray-400/75 dark:text-gray-300/50",
          drawing && "trail-map-draw",
        )}
      >
        {layout && (
          <svg
            aria-hidden="true"
            width={layout.width}
            height={layout.height}
            className="absolute inset-0"
          >
            <g fill="currentColor">
              {layout.dots.map((dot, i) => (
                <circle
                  // biome-ignore lint/suspicious/noArrayIndexKey: a dot is its place on the trail; a resize moves the same circles
                  key={i}
                  className="trail-dot"
                  cx={dot.x.toFixed(1)}
                  cy={dot.y.toFixed(1)}
                  r={DOT_RADIUS}
                  opacity={dot.dim ? DIMMED : undefined}
                  style={{ animationDelay: `${dot.delay}ms` }}
                />
              ))}
            </g>
            {layout.marks.map((mark) => (
              <Marker key={mark.kind + mark.x} mark={mark} compassRadius={layout.compassRadius} />
            ))}
          </svg>
        )}
      </div>
      {children}
    </div>
  );
};

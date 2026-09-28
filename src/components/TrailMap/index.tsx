import { type ReactNode, useEffect, useRef, useState } from "react";
import { distance, dotsAlong, smoothCurve, soften, type Vec } from "./curve";
import { Marker } from "./glyphs";
import { LEFT, type MarkKind, NARROW_ROUTE, RIGHT, type Route, WIDE_ROUTE } from "./routes";

/*
 * /start-here drawn as an old map: a dotted trail that winds down the whole
 * page, around the title and the intro text, under the photos and cards and
 * past the links, with a compass rose in the top right and mountains, rivers,
 * marshes and sea along the way. It is decoration only: aria-hidden, no
 * pointer events, and nothing until the client has measured the page.
 *
 * The trail is laid out in pixels, not stretched: routes.ts traces it over the
 * page at a reference width, the client moves each point with the page (see
 * there), evens out the wobbles, joins the points with a smooth curve and puts
 * a dot every SPACING px along it. So dots stay round, the spacing stays even
 * and the trail keeps to the gaps it was traced through at any width.
 *
 * Dots over a line of text are dimmed so the trail never gets in the way of
 * reading; under photos and cards it simply disappears and comes out the other
 * side. Each marker takes the first of its spots that is on screen and clear
 * of text, links, pictures and the trail, or stays away.
 *
 * Drawing in: a pen follows the trail, drawing whatever part of it has come
 * into view and then waiting at the bottom of the window for the reader to
 * scroll on. Every dot fades in when the pen reaches it (animation-delay per
 * dot, set when its stretch comes into view), each marker once the pen has
 * gone past. The CSS is .trail-dot and friends in globals.css; with reduced
 * motion every stretch is simply there when it comes into view.
 */

const SPACING = 13;
const DOT_RADIUS = 1.5;
const DIMMED = 0.3;
/** The map runs on this far below the wrapper. */
const BELOW = 80;
/** Where the trail leaves the window, just outside it, so it runs off the map. */
const OFF_EDGE = 24;
const SOFTEN_PASSES = 4;

/** The pen waits this long after load before it starts. */
const PEN_START_MS = 900;
const PEN_MS_PER_DOT = 16;
/** A long stretch that comes into view at once is drawn faster, in at most this long. */
const PEN_BATCH_MS = 2600;
/**
 * A reader who scrolls faster than the pen draws gets a second pen for the
 * new stretch once the first is this far behind, instead of an empty page.
 */
const PEN_MAX_LAG_MS = 500;
/** The pen stops this far (a share of the window height) above the bottom of the window. */
const PEN_LOOKAHEAD = 0.1;

type Size = { r: number; clear: number };

/** r: radius the marker takes up. clear: how close the trail may come to its centre. */
const SIZES: Record<MarkKind, Size> = {
  compass: { r: 56, clear: 60 },
  range: { r: 20, clear: 30 },
  peaks: { r: 15, clear: 24 },
  marsh: { r: 20, clear: 28 },
  river: { r: 26, clear: 32 },
  waves: { r: 20, clear: 34 },
};
const NARROW_COMPASS: Size = { r: 37, clear: 42 };

type Dot = { x: number; y: number; dim: boolean; offscreen: boolean };
/** `anchor`: the dot after which the marker appears; -1 for the compass, which comes first. */
type Placed = { id: number; kind: MarkKind; x: number; y: number; anchor: number };
type Layout = {
  width: number;
  height: number;
  compassRadius: number;
  dots: Dot[];
  marks: Placed[];
};
type Box = { left: number; top: number; right: number; bottom: number };
/** Per dot: the entrance delay it was given when the pen reached it, or undefined while it waits. */
type Shown = (number | undefined)[];
type MapState = { layout: Layout; shown: Shown; compass?: number };

const inside = ([x, y]: Vec, box: Box, pad: number) =>
  x > box.left - pad && x < box.right + pad && y > box.top - pad && y < box.bottom + pad;

/** Lays out the map against the current page, in px relative to the map box. */
function layOut(wrapper: HTMLElement, mapBox: HTMLElement): Layout {
  const origin = mapBox.getBoundingClientRect();
  const local = (r: DOMRect): Box => ({
    left: r.left - origin.left,
    top: r.top - origin.top,
    right: r.right - origin.left,
    bottom: r.bottom - origin.top,
  });
  const column = local(wrapper.getBoundingClientRect());
  const width = origin.width;
  const height = origin.height;
  const wide = window.matchMedia("(min-width: 48rem)").matches;
  const route: Route = wide ? WIDE_ROUTE : NARROW_ROUTE;

  // Where each of the route's rulers is now, in the order they were traced.
  const edgeOf = (name: string): number | undefined => {
    if (name === "top") return column.top;
    if (name === "end") return column.bottom + BELOW;
    const cut = name.lastIndexOf(".");
    const path = name.slice(0, cut);
    const side = name.slice(cut + 1) as "top" | "bottom";
    const child = /^(.*)\.(\d+)$/.exec(path);
    const element = child
      ? wrapper.querySelector(`[data-trail="${child[1]}"]`)?.children[Number(child[2])]
      : wrapper.querySelector(`[data-trail="${path}"]`);
    return element ? local(element.getBoundingClientRect())[side] : undefined;
  };
  const rulers: [traced: number, now: number][] = [];
  for (const [name, traced] of Object.entries(route.rulers).sort((a, b) => a[1] - b[1])) {
    const now = edgeOf(name);
    if (now === undefined) continue;
    rulers.push([traced, Math.max(now, rulers.at(-1)?.[1] ?? now)]);
  }
  const toY = (y: number) => {
    const next = rulers.findIndex(([traced]) => traced >= y);
    if (next <= 0) {
      const [traced, now] = rulers[next === 0 ? 0 : rulers.length - 1];
      return now + y - traced;
    }
    const [a, aNow] = rulers[next - 1];
    const [b, bNow] = rulers[next];
    return aNow + ((y - a) / (b - a || 1)) * (bNow - aNow);
  };
  const toX = (x: number) =>
    x === LEFT
      ? -OFF_EDGE
      : x === RIGHT
        ? width + OFF_EDGE
        : column.left + (x / route.column) * (column.right - column.left);
  const toPx = ([x, y]: readonly [number, number]): Vec => [toX(x), toY(y)];

  // Every line of text in the wrapper, as its own box, and everything a
  // marker should not cover.
  const lines: Box[] = [];
  const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim() || mapBox.contains(node)) continue;
    range.selectNodeContents(node);
    for (const rect of range.getClientRects()) lines.push(local(rect));
  }
  const blocked = [
    ...lines,
    ...[...wrapper.querySelectorAll("img, a, form")].map((e) => local(e.getBoundingClientRect())),
  ];

  const pinned = route.points.map(([x]) => x === LEFT || x === RIGHT);
  const along = dotsAlong(
    smoothCurve(soften(route.points.map(toPx), pinned, SOFTEN_PASSES)),
    SPACING,
  );
  // Where the trail crosses itself, keep one of two dots that would clump.
  const points = along.filter((p, i) => {
    for (let j = 0; j < i - 3; j++) if (distance(p, along[j]) < SPACING * 0.6) return false;
    return true;
  });
  const dots = points.map(([x, y]) => ({
    x,
    y,
    dim: lines.some((line) => inside([x, y], line, 3)),
    offscreen: x < -2 || x > width + 2,
  }));

  const sizeOf = (kind: MarkKind) => (kind === "compass" && !wide ? NARROW_COMPASS : SIZES[kind]);
  const marks: Placed[] = [];
  route.marks.forEach((mark, id) => {
    const { r, clear } = sizeOf(mark.kind);
    const fit = mark.spots
      .map(toPx)
      .find(
        (c) =>
          c[0] - r > 8 &&
          c[0] + r < width - 8 &&
          c[1] - r > 0 &&
          c[1] + r < height &&
          !blocked.some((b) => inside(c, b, r + 8)) &&
          !points.some((p) => distance(p, c) < clear) &&
          !marks.some((m) => distance([m.x, m.y], c) < r + sizeOf(m.kind).r + 8),
      );
    if (!fit) return;
    let anchor = -1;
    if (mark.kind !== "compass") {
      let nearest = 0;
      points.forEach((p, i) => {
        if (distance(p, fit) < clear + 60) anchor = i;
        if (distance(p, fit) < distance(points[nearest], fit)) nearest = i;
      });
      if (anchor < 0) anchor = nearest;
    }
    marks.push({ id, kind: mark.kind, x: fit[0], y: fit[1], anchor });
  });

  return { width, height, compassRadius: sizeOf("compass").r, dots, marks };
}

/**
 * Wraps the page content and draws the map behind it. Rulers the routes are
 * laid out on come from `data-trail` marks in the content (see routes.ts).
 */
export const TrailMap = ({ children }: { children: ReactNode }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MapState | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const map = mapRef.current;
    if (!wrapper || !map) return;
    let current: MapState | null = null;
    // When the pen is done with everything it has been given so far.
    let penFree = 0;
    let frame = 0;

    const commit = (next: MapState) => {
      current = next;
      setState(next);
    };

    // Hands the pen every waiting dot that has come into view, in trail order.
    const reveal = (from: MapState): MapState => {
      const bottom = window.innerHeight * (1 - PEN_LOOKAHEAD) - map.getBoundingClientRect().top;
      const waiting = from.layout.dots.flatMap((dot, i) =>
        from.shown[i] === undefined && dot.y < bottom ? [i] : [],
      );
      if (!waiting.length) return from;
      const now = performance.now();
      const first = penFree === 0;
      const start = first
        ? now + PEN_START_MS
        : Math.min(Math.max(now, penFree), now + PEN_MAX_LAG_MS);
      const drawn = waiting.filter((i) => !from.layout.dots[i].offscreen).length;
      const step = Math.min(PEN_MS_PER_DOT, PEN_BATCH_MS / Math.max(drawn, 1));
      const shown = [...from.shown];
      let at = start - now;
      for (const i of waiting) {
        shown[i] = at;
        // Off the edge of the window the pen takes no time.
        if (!from.layout.dots[i].offscreen) at += step;
      }
      penFree = now + at;
      return { ...from, shown, compass: first ? start - now - 600 : from.compass };
    };

    const update = () => {
      const layout = layOut(wrapper, map);
      const old = current;
      // Same trail, new size: every dot keeps what it had, so nothing replays.
      const shown: Shown = layout.dots.map(
        (_, i) =>
          old?.shown[
            Math.round((i * (old.layout.dots.length - 1)) / Math.max(layout.dots.length - 1, 1))
          ],
      );
      commit(reveal({ layout, shown, compass: old?.compass }));
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (current?.shown.includes(undefined)) {
          const next = reveal(current);
          if (next !== current) commit(next);
        }
      });
    };

    // The map box follows the window, the wrapper follows the content.
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    observer.observe(map);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const layout = state?.layout;
  return (
    <div ref={wrapperRef} className="relative isolate">
      <div
        ref={mapRef}
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -bottom-20 left-1/2 -z-10 w-screen -translate-x-1/2 text-gray-400/75 dark:text-gray-300/50"
      >
        {state && layout && (
          <svg
            aria-hidden="true"
            width={layout.width}
            height={layout.height}
            className="absolute inset-0"
          >
            <g fill="currentColor">
              {layout.dots.map((dot, i) => {
                const delay = state.shown[i];
                return delay === undefined ? null : (
                  <circle
                    // biome-ignore lint/suspicious/noArrayIndexKey: a dot is its place on the trail; a resize moves the same circles
                    key={i}
                    className="trail-dot"
                    cx={dot.x.toFixed(1)}
                    cy={dot.y.toFixed(1)}
                    r={DOT_RADIUS}
                    opacity={dot.dim ? DIMMED : undefined}
                    style={{ animationDelay: `${Math.round(delay)}ms` }}
                  />
                );
              })}
            </g>
            {layout.marks.map((mark) => {
              const after = mark.anchor < 0 ? state.compass : state.shown[mark.anchor];
              return after === undefined ? null : (
                <Marker
                  key={mark.id}
                  kind={mark.kind}
                  x={mark.x}
                  y={mark.y}
                  compassRadius={layout.compassRadius}
                  delay={mark.anchor < 0 ? after : after + 150}
                />
              );
            })}
          </svg>
        )}
      </div>
      {children}
    </div>
  );
};

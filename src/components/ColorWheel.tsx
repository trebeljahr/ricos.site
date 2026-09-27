import clsx from "clsx";
import Link from "next/link";
import { COLOR_BUCKETS, type ColorBucketId } from "src/lib/colorBuckets.mjs";
import type { PhotoColorCounts } from "src/lib/photographyColors";
import { formatCount } from "src/lib/utils/formatCount";

type Props = {
  counts: PhotoColorCounts;
  /** Family whose segment is drawn pulled out and outlined. */
  active?: ColorBucketId | null;
  /** Show the labelled list under the wheel. On at the /photography/colors
   *  index, off where the wheel is a secondary navigation aid beside a
   *  heading that already names the family. */
  showLegend?: boolean;
  className?: string;
};

const OUTER = 160;
const INNER = 88;
const CENTER = 176;
const VIEWBOX = CENTER * 2;
/** Gap between segments, in degrees, so the ring reads as eleven distinct
 *  choices rather than one continuous gradient. */
const GAP_DEG = 1.6;
/** How far the active segment slides outward along its own bisector. */
const ACTIVE_OFFSET = 10;

function polar(cx: number, cy: number, radius: number, degrees: number) {
  // -90 so segment zero starts at twelve o'clock rather than three.
  const rad = ((degrees - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

/** Annular sector path from `startDeg` to `endDeg`. */
function segmentPath(cx: number, cy: number, startDeg: number, endDeg: number): string {
  const outerStart = polar(cx, cy, OUTER, startDeg);
  const outerEnd = polar(cx, cy, OUTER, endDeg);
  const innerEnd = polar(cx, cy, INNER, endDeg);
  const innerStart = polar(cx, cy, INNER, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER} ${OUTER} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER} ${INNER} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function href(id: ColorBucketId): string {
  return `/photography/colors/${id}`;
}

function countLabel(label: string, count: number): string {
  return `${label}, ${count} photo${count === 1 ? "" : "s"}`;
}

/**
 * The colour wheel on /photography/colors: eleven linked segments, one per
 * family, sized equally rather than by population.
 *
 * Equal segments because the ring is a chooser and not a chart. Scaling by
 * count would give green 35% of the circle and white 0.7% of it — a 2.5°
 * wedge, which is unhittable with a mouse and invisible on a phone. The
 * populations are stated as numbers in the legend instead, where they can be
 * read rather than estimated from an angle.
 *
 * Rendered as plain SVG `<a>` links, so it needs no client JavaScript and
 * every segment is a real, focusable, crawlable link. Deliberately not
 * `next/link` inside the `<svg>`: React creates an SVG anchor there, whose
 * `href` is an `SVGAnimatedString` rather than a string, which is not what
 * the router's click handling expects. The legend and the tile grid below are
 * in HTML context and do use `next/link`.
 *
 * The tile grid is the wheel's mobile twin, not a decoration. A legend row of
 * 11 text links gives each one about 20px of height; the thumb it is tapped
 * with needs 44. So under `sm` the labels become tiles that clear that, and
 * the legend row takes over from `sm` up where a pointer is likely.
 */
export function ColorWheel({ counts, active = null, showLegend = true, className }: Props) {
  const step = 360 / COLOR_BUCKETS.length;

  return (
    <div className={clsx("flex flex-col items-center gap-6", className)}>
      {/* The rule below suggests <fieldset>, which cannot hold SVG geometry.
          The twelve segments are a set of links that needs one accessible
          name, and role="group" on the <svg> is the only way to give an SVG
          subtree one. */}
      {/* biome-ignore lint/a11y/useSemanticElements: <fieldset> cannot hold SVG geometry */}
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        role="group"
        aria-label="Colour families"
        className="w-full max-w-[352px]"
      >
        <title>Browse the photography by colour family</title>
        {COLOR_BUCKETS.map((bucket, i) => {
          const start = i * step + GAP_DEG / 2;
          const end = (i + 1) * step - GAP_DEG / 2;
          const isActive = bucket.id === active;
          const mid = (start + end) / 2;
          const nudge = polar(0, 0, ACTIVE_OFFSET, mid);
          const count = counts[bucket.id] ?? 0;
          return (
            <a
              key={bucket.id}
              href={href(bucket.id)}
              aria-label={countLabel(bucket.label, count)}
              className="group focus:outline-hidden"
            >
              <path
                d={segmentPath(CENTER, CENTER, start, end)}
                fill={bucket.swatch}
                transform={isActive ? `translate(${nudge.x} ${nudge.y})` : undefined}
                strokeWidth={isActive ? 2 : 1}
                // The keyboard indicator is the outline the active segment
                // already wears, not the hover dim: an opacity change
                // identical to hover is not a focus ring, and the anchor has
                // suppressed the UA one. `stroke-current` inherits the text
                // colour set on the group, which is what carries the outline
                // into dark mode without a second set of classes.
                className={clsx(
                  "origin-center text-gray-900 transition-opacity dark:text-gray-100",
                  "group-hover:opacity-80 group-focus-visible:stroke-current group-focus-visible:stroke-2 group-focus-visible:opacity-80",
                  isActive ? "stroke-current" : "stroke-black/15",
                )}
              />
            </a>
          );
        })}
        <text
          x={CENTER}
          y={CENTER - 4}
          textAnchor="middle"
          className="fill-gray-900 text-[22px] dark:fill-gray-100"
        >
          {active ? formatCount(counts[active] ?? 0) : COLOR_BUCKETS.length}
        </text>
        <text
          x={CENTER}
          y={CENTER + 18}
          textAnchor="middle"
          className="fill-gray-500 text-[12px] dark:fill-gray-400"
        >
          {active ? "photos" : "families"}
        </text>
      </svg>

      {/* The legend is not decoration either: it carries the labels and the
          counts, which the wheel can only express as accessible names. */}
      {showLegend && (
        <>
          <ul className="hidden flex-wrap justify-center gap-x-4 gap-y-2 text-sm sm:flex">
            {COLOR_BUCKETS.map((bucket) => {
              const count = counts[bucket.id] ?? 0;
              const isActive = bucket.id === active;
              return (
                <li key={bucket.id}>
                  <Link
                    href={href(bucket.id)}
                    aria-label={countLabel(bucket.label, count)}
                    className={clsx(
                      "flex items-center gap-1.5 rounded-sm focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                      isActive
                        ? "font-medium text-gray-900 dark:text-gray-50"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-3 rounded-full ring-1 ring-black/15 ring-inset"
                      style={{ backgroundColor: bucket.swatch }}
                    />
                    {bucket.label}
                    <span className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Two columns under 320px and three above it: four would leave
              about 80px per tile, which is not enough for a 20px swatch, a
              label like "Orange" and a four-digit count at text-sm. */}
          <ul className="grid w-full grid-cols-2 gap-2 text-sm xs:grid-cols-3 sm:hidden">
            {COLOR_BUCKETS.map((bucket) => {
              const count = counts[bucket.id] ?? 0;
              const isActive = bucket.id === active;
              return (
                <li key={bucket.id}>
                  <Link
                    href={href(bucket.id)}
                    aria-label={countLabel(bucket.label, count)}
                    className={clsx(
                      "flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 ring-1 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                      isActive
                        ? "font-medium text-gray-900 ring-gray-400 dark:text-gray-50 dark:ring-gray-500"
                        : "text-gray-700 ring-gray-200 dark:text-gray-300 dark:ring-gray-700",
                    )}
                  >
                    {/* Bigger than the legend dot on purpose: on a phone the
                        swatch is doing the identifying, because the label is
                        truncated long before "Purple" fits next to a count. */}
                    <span
                      aria-hidden
                      className="size-5 shrink-0 rounded-full ring-1 ring-black/15 ring-inset"
                      style={{ backgroundColor: bucket.swatch }}
                    />
                    <span className="min-w-0 flex-1 truncate">{bucket.label}</span>
                    <span className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

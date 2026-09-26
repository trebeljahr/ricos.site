import clsx from "clsx";

/*
 * A faint dotted line, like a hiking trail on a map, drawn behind the intro
 * section of /start-here. It is pure decoration: aria-hidden, no pointer
 * events and no client JavaScript.
 *
 * How it holds up across viewports:
 *   - preserveAspectRatio="none" lets the curve stretch to whatever size the
 *     section ends up at, so the route stays in the same whitespace whether
 *     the text wraps into three lines or six.
 *   - vector-effect="non-scaling-stroke" measures the stroke (and with it the
 *     dash pattern) in device pixels after that stretch. Without it the dots
 *     would squash into ellipses and their spacing would drift.
 *   - the draw-in is a gradient mask growing down the wrapper (.trail-draw in
 *     globals.css), not an animated <mask> inside the SVG: Chrome caches an
 *     SVG mask and never repaints the masked path when only the mask content
 *     animates, so that variant stayed invisible.
 *
 * The routes are hand-tuned around the intro layout. Coordinates are percent
 * of the SVG box, which spans the section plus the 80px below it.
 */

// Desktop (md+): the section is [photo | text]. The trail comes in at the top
// right, sweeps left through the empty strip above the text, walks down the
// gutter between the photo and the words, then swings back out to the right
// below the text and leaves through the bottom.
const WIDE_TRAIL = [
  "M 92 0",
  "C 88 6, 80 3, 72 8",
  "C 64 13, 56 16, 48 13",
  "C 43 11, 40.8 16, 40.5 25",
  "C 40 36, 41.6 47, 40.5 58",
  "C 40.4 66, 42 72, 47 74",
  "C 54 77, 62 71, 70 74",
  "C 79 77, 84 84, 83 92",
  "C 82.5 96, 81 98, 80 100",
].join(" ");

// Mobile: one column, so the only free lanes are the page padding beside the
// text, the gap under the photo and the space below. The trail starts hidden
// behind the photo, comes out of its bottom edge, hugs the left margin next to
// the text and crosses to the right on its way down.
const NARROW_TRAIL = [
  "M 78 0",
  "C 70 14, 60 26, 44 36",
  "C 30 44, 16 41, 8 47",
  "C 3 51, 2.5 58, 3 66",
  "C 3.4 74, 1.5 80, 3 86",
  "C 4.5 90, 12 91, 22 92",
  "C 34 93, 44 96, 52 100",
].join(" ");

const Trail = ({ d, className }: { d: string; className: string }) => (
  <div
    className={clsx(
      "trail-draw pointer-events-none absolute -inset-x-3 top-0 -bottom-20 -z-10",
      className,
    )}
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full text-gray-400/55 dark:text-gray-500/45"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        // A zero-length dash with a round cap is a dot. 0.01 instead of 0
        // because Safari drops dashes of exactly zero length.
        strokeDasharray="0.01 13"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  </div>
);

export const DottedTrail = () => (
  <>
    <Trail d={NARROW_TRAIL} className="md:hidden" />
    <Trail d={WIDE_TRAIL} className="hidden md:block" />
  </>
);

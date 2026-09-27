import clsx from "clsx";

/*
 * A faint dotted line, like a hiking trail on a map, running edge to edge
 * behind the intro section of /start-here. It is pure decoration: aria-hidden,
 * no pointer events and no client JavaScript.
 *
 * How it holds up across viewports:
 *   - the box is full-bleed (w-screen, centred on the container) so the trail
 *     enters and leaves at the window edges, not at the text column.
 *   - preserveAspectRatio="none" lets the curve stretch to whatever size the
 *     section ends up at, so the route keeps its shape whether the text wraps
 *     into three lines or six.
 *   - vector-effect="non-scaling-stroke" measures the stroke (and with it the
 *     dash pattern) in device pixels after that stretch. Without it the dots
 *     would squash into ellipses and their spacing would drift.
 *   - the trail passes behind the photo and the text. .trail-draw in
 *     globals.css dims it over the middle of the window, where the content
 *     column sits at every width, so it stays out of the way of reading and is
 *     only at full strength out in the margins.
 *   - that same rule draws it in, left to right, a second after load. It is a
 *     gradient mask growing sideways over the wrapper rather than an animated
 *     <mask> inside the SVG: Chrome caches an SVG mask and never repaints the
 *     masked path when only the mask content animates.
 *
 * The routes are hand-drawn. Coordinates are percent of the box: x of the
 * window width, y of the section height plus the 80px below it.
 */

// Desktop (md+): the section is [photo | text]. The trail comes in low on the
// left, climbs past the photo, doubles back twice over the text and leaves on
// the right a little higher than it arrived.
const WIDE_TRAIL = [
  "M -4 66",
  "C 5 65, 8 58, 14 57",
  "C 21 56, 23 46, 31 45",
  "C 38 44, 41 52, 48 48",
  "C 55 44, 56 30, 66 29",
  "C 73 28.4, 76 39, 81 42",
  "C 86 45, 89 40, 94 41",
  "C 99 42, 100 37, 105 32",
].join(" ");

// Mobile: one column, and the photo fills the top of it, so the trail stays in
// the lower half where it can actually be seen — across the last paragraph and
// the space under it.
const NARROW_TRAIL = [
  "M -4 72",
  "C 8 69, 14 79, 24 81",
  "C 33 82.5, 38 74, 46 73",
  "C 54 72, 59 79, 60 86",
  "C 61 93, 69 97, 78 93",
  "C 86 89.5, 94 87, 104 88",
].join(" ");

const Trail = ({ d, className }: { d: string; className: string }) => (
  <div
    className={clsx(
      "trail-draw pointer-events-none absolute top-0 -bottom-20 left-1/2 -z-10 w-screen -translate-x-1/2",
      className,
    )}
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full text-gray-400/75 dark:text-gray-300/50"
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

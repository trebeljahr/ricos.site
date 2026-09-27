import { CustomLightBox, useCustomLightbox } from "@components/Galleries/useCustomLightbox";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import clsx from "clsx";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ImageProps } from "src/@types";
import type { ColorBucketId } from "src/lib/colorBuckets.mjs";
import { nextImageUrl } from "src/lib/mapToImageProps";
import { formatCount } from "src/lib/utils/formatCount";
import { addIdAndIndex } from "src/lib/utils/misc";
import { offsetOfPosition, positionAtOffset, ribbonRows } from "src/lib/utils/ribbonRows";
import { alongBand, bandAt, positionInBand, segmentGradient } from "src/lib/utils/spectrumScale";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

/**
 * One stop on the hue scale above the ribbon: the point in the sweep where a
 * hue wedge starts, so a reader can jump to a region of the colour circle.
 */
type SpectrumMark = {
  /** The family this stretch of the strip holds. Every band is a real family
   *  now, neutrals included, so there is no synthetic key. */
  key: ColorBucketId;
  label: string;
  /** CSS background for this stretch of the scale strip — a family swatch, or
   *  a black-to-white ramp for the tail, which is ordered by lightness. */
  fill: string;
  /** Index into `images` where this stretch begins. */
  index: number;
  count: number;
};

type Props = {
  /** Every photo, in spectrum order, straight out of `imagesBySpectrum()`. */
  images: ImageProps[];
  /** Each photo's mean colour as a CSS colour, in the same order. Its tile
   *  shows it until the photograph arrives. */
  tints: string[];
  marks: SpectrumMark[];
};

/**
 * One tile of the ribbon, with every string the `<img>` and its button need
 * already built.
 *
 * Kept as its own array rather than as extra fields on the photos: the same
 * photo objects go to the lightbox as `slides`, and `srcSet` there is a list of
 * `{ src, width }` sources, not the string an `<img>` attribute takes. Two
 * different meanings for one property name on one object is a trap for whoever
 * next adds a field to either side.
 */
type RibbonTile = {
  /** Stable DOM id from `addIdAndIndex`. The morph back out of the lightbox
   *  finds the tile by it, so it has to be the photo's own id. */
  id: string;
  /** Position in `photos`, which is the array the lightbox walks with
   *  prev/next. */
  index: number;
  /** Fallback src for a browser that ignores `srcSet`, at the smallest
   *  variant. */
  src: string;
  srcSet: string;
  sizes: string;
  /** Layout aspect ratio after clamping: the flex-grow factor, and the
   *  multiplier the natural-width basis is derived from in CSS. */
  ratio: number;
  /** Intrinsic width attribute, paired with the constant 180px height. Only
   *  there to reserve the right box before the bytes arrive. */
  width: number;
  /** Background shown until the photograph arrives. */
  tint: string;
  label: string;
};

/**
 * Tiles rendered before the ribbon has been measured: on the server, and in
 * the first client render, which has to match it. About a screen and a half
 * at the widest layout, where a row holds the most photographs. The measured
 * ribbon replaces them before the browser paints anything else.
 */
const FIRST_PAINT = 120;

/**
 * How far past each edge of the viewport rows are kept in the document, in
 * viewport heights. New rows are rendered once the viewport has come within
 * half of this of the edge, so ordinary scrolling re-renders about once a
 * screen rather than once a row.
 */
const OVERSCAN = 1;

/**
 * A tile on screen for less than this, in milliseconds, is not worth fetching.
 *
 * A drag along the scale can cross the whole archive in a second, and every
 * tile it passes would start a download that nothing cancels: a few thousand
 * requests queued ahead of the photographs where the drag stops, which then
 * take seconds to appear. While the page moves faster than a viewport per
 * this many milliseconds, tiles that have not loaded show their tint instead,
 * and they fetch once it has been still this long.
 */
const GLIMPSE_MS = 150;

/**
 * Clamp on the layout aspect ratio.
 *
 * Measured on this archive: 33 photos are wider than 2.5:1 and 3 are narrower
 * than 0.5:1, the extremes being a 6.4:1 panorama and a 0.36:1 crop. Laid out
 * at their true ratio the panorama alone is 512px of a 1000px row — one frame
 * taking the space of six, in a strip whose whole point is that no single frame
 * stands out. Clamping costs those 36 photos a centre crop and costs the other
 * 4,864 nothing.
 */
const RATIO_MIN = 0.5;
const RATIO_MAX = 2.5;

/** Thumbnail widths pulled from the pipeline's size ladder.
 *
 *  The ribbon never renders a tile wider than 450 CSS px (the 2.5:1 clamp at
 *  the 180px row height), so 1080 is the largest that earns its bytes: it
 *  covers a 450px tile at device-pixel-ratio 2 with nothing to spare. 256
 *  covers the median portrait tile, 135px wide at that row height, on the same
 *  screen, and the two in between carry the range. The browser picks per tile
 *  and per screen. Nothing above 1080 is ever resolved, so the ladder stops. */
const THUMB_WIDTHS = [256, 384, 640, 1080];

/** The ribbon's `gap-px`, which `ribbonRows` has to count into every row. */
const TILE_GAP = 1;

/**
 * Pixels each row's tiles are sized short of the full width, handed back to
 * them by `flex-grow` once the row is laid out.
 *
 * The browser rounds every flex basis to its layout unit (1/64px in Chrome and
 * Safari) before deciding what fits on a line, so a row sized to exactly 100%
 * can come out a fraction of a pixel over, and its last tile wraps. That tile
 * then overfills the next row, whose last tile wraps in turn, and the whole
 * ribbon below it falls apart. Two pixels covers the rounding of a hundred
 * tiles, and no tile is narrow enough to fit into them.
 */
const ROW_SLACK = 2;

/**
 * How far the last row may be stretched to fill. It has no following tile to
 * take in instead, so a last row of two photographs would otherwise be pulled
 * across the whole width; past this it is left short. 1.35 keeps the crop
 * `object-cover` takes to about a quarter of the frame.
 */
const TRAILING_MAX_STRETCH = 1.35;

const clampRatio = (width: number, height: number) =>
  Math.min(RATIO_MAX, Math.max(RATIO_MIN, width / height));

/** Trip folder out of a metadata key, "assets/photography/<trip>/<file>". */
const tripOf = (src: string) => turnKebabIntoTitleCase(src.split("/")[2] ?? "");

/**
 * /photography/spectrum — the whole archive as one continuous ribbon, ordered
 * by the family each photo belongs to, walking the colour ring, and by hue
 * angle inside each band. See `imagesBySpectrum` for why it is not ordered by
 * hue angle alone: over half this archive is close enough to grey that its
 * mean angle is noise, and sorting on it produced a random-looking grid.
 *
 * WHY THIS IS NOT A GALLERY
 * -------------------------
 * `GalleryPage` is the right component everywhere else on the site and the
 * wrong one here. It lays photos out in justified rows at a 400px target
 * height, which is a good size for looking at a photograph and hopeless for
 * looking at four thousand of them: the sweep this page exists to show only
 * appears once the frames are small enough that the eye reads the row instead
 * of the picture. Small, though, not tiny — at the 48px row this started with,
 * neither the sweep nor the photographs were legible and the strip read as
 * noise. The row heights below are the smallest at which a frame is still
 * recognisably a photograph. So the tiles are uniform-height, and the layout is a
 * plain flex wrap rather than react-photo-album — the album's rows layout
 * justifies by varying row *height*, which is exactly the one property that has
 * to stay constant for a ribbon to read as a ribbon.
 *
 * WHY THE SCALE ONLY LABELS EIGHT FAMILIES
 * ----------------------------------------
 * Photos are filed into eleven families. Only eight of those are colours:
 * white, grey and black have no hue by definition and make up the tail.
 * Labelling those on a colour axis would be a promise the axis cannot keep.
 *
 * WHERE A PHOTO CARRYING TWO COLOURS ENDS UP
 * ------------------------------------------
 * In whichever of them covers more of the frame — see `primaryFamily` in
 * src/lib/photographyColors.ts. A red wall behind green foliage sits once, in
 * the band for whichever it carries more of, and nowhere else. Every photo is
 * in exactly one place in this strip, which is the whole of the feature: there
 * is no second view it could disagree with.
 */
export default function PhotographySpectrumPage({ images, tints, marks }: Props) {
  const total = images.length;

  const photos = useMemo(() => images.map(addIdAndIndex), [images]);

  /**
   * Every tile's markup-ready strings, built once per props change.
   *
   * Memoized for the same reason GalleryPage memoizes its srcSet, only more
   * so, because this page re-renders far more often than a gallery does. The
   * lightbox's current slide is state in `useCustomLightbox`, which this
   * component calls, so every arrow press in the lightbox — and every screen
   * the reader scrolls — re-renders the rows in the document. Building the
   * strings in the map body meant a template label and a `srcSet` join over
   * four `nextImageUrl` calls per tile per render, to produce byte-identical
   * attributes each time.
   *
   * `total` is in the deps for the label, and is `images.length`, so it cannot
   * move without `photos` moving too.
   */
  const tiles = useMemo<RibbonTile[]>(
    () =>
      photos.map((photo) => {
        const ratio = clampRatio(photo.width, photo.height);
        return {
          id: photo.id,
          index: photo.index,
          src: nextImageUrl(photo.src, THUMB_WIDTHS[0]),
          srcSet: THUMB_WIDTHS.map((width) => `${nextImageUrl(photo.src, width)} ${width}w`).join(
            ", ",
          ),
          // The three row heights, in the same breakpoint order the list sets
          // --ribbon-h in. These are the unstretched natural widths: filling a
          // row can push a tile up to 1.25x wider on desktop and about 1.4x on
          // a phone (see ribbonRows), so a stretched tile is that much
          // under-resolved. Declaring the stretched width instead would move
          // most of the archive from the 128 variant to the 256 one to sharpen
          // a 60px thumbnail.
          sizes: `(min-width: 1024px) ${Math.round(180 * ratio)}px, (min-width: 640px) ${Math.round(140 * ratio)}px, ${Math.round(100 * ratio)}px`,
          ratio,
          width: Math.round(180 * ratio),
          tint: tints[photo.index] ?? "transparent",
          // The label, not the alt text, carries the meaning here. Alt from the
          // filename would read "DSC04727" 1,950 times over, which is worse
          // than nothing, so the image is marked decorative and the button says
          // what it opens.
          label: `Open photo ${formatCount(photo.index + 1)} of ${formatCount(total)}, from ${tripOf(photo.src)}`,
        };
      }),
    [photos, tints, total],
  );

  const lightbox = useCustomLightbox({ photos });
  const { openModal, currentImageIndex, isModalOpen } = lightbox;

  const listRef = useRef<HTMLOListElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  /** The ribbon's width and row height as laid out, which is what the rows
   *  are broken against. Null on the server and in the first client render,
   *  which show the first FIRST_PAINT tiles in plain flex-wrap instead. */
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);

  // A layout effect so the first measured layout replaces the fallback before
  // the browser paints it. The observer fires again only when the list's box
  // changes, which, with its height fixed below, is a resize.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const width = list.getBoundingClientRect().width;
      const height = Number.parseFloat(getComputedStyle(list).getPropertyValue("--ribbon-h"));
      if (!(width > 0) || !(height > 0)) return;
      setFrame((prev) =>
        prev?.width === width && prev.height === height ? prev : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  /**
   * Every row of the whole sweep, and each tile's `flex-basis`.
   *
   * Laid out for all 1,950 photos at once, from the first, and only again when
   * the width changes. That is what makes the ribbon a fixed shape a reader
   * can scroll through: rows never re-pack under them, and with the row
   * height constant the whole document's geometry is arithmetic — row `r` is
   * `r * pitch` down — so the page can be as tall as the sweep while holding
   * only the rows near the viewport.
   *
   * The basis is a share of 100% rather than a width in pixels, although the
   * pixels are right there in `frame`. The breaks are worked out against one
   * measured width and the browser lays out against the real one, and the two
   * disagree for a frame whenever the page resizes — a scrollbar appearing is
   * enough. Pixel bases a few px too wide for the real row push its last tile
   * onto the next line, and the misfit cascades down the whole ribbon. A share
   * of the row cannot overflow it: at worst, breaks computed for a stale width
   * crop a little more than they would have, until the observer catches up.
   * `undefined` leaves a tile on the natural-width basis in its class, which
   * is what a short last row uses.
   */
  const layout = useMemo(() => {
    if (!frame) return null;
    const ratios = tiles.map((tile) => tile.ratio);
    const rows = ribbonRows(
      ratios,
      frame.width - ROW_SLACK,
      frame.height,
      TILE_GAP,
      TRAILING_MAX_STRETCH,
    );
    const bases: (string | undefined)[] = new Array(tiles.length);
    for (const row of rows) {
      if (row.scale === null) continue;
      let sum = 0;
      for (let i = row.start; i < row.end; i++) sum += ratios[i];
      const reserved = TILE_GAP * (row.end - row.start - 1) + ROW_SLACK;
      for (let i = row.start; i < row.end; i++) {
        bases[i] = `calc((100% - ${reserved}px) * ${ratios[i] / sum})`;
      }
    }
    const pitch = frame.height + TILE_GAP;
    return { rows, bases, pitch, height: rows.length * pitch };
  }, [tiles, frame]);

  /** The rows in the document, `first` inclusive to `last` exclusive. */
  const [span, setSpan] = useState({ first: 0, last: 0 });

  /** True while the page moves faster than a tile could load; see
   *  GLIMPSE_MS. Tiles that have not loaded yet show their tint meanwhile. */
  const [hurrying, setHurrying] = useState(false);
  /** Tiles whose photograph has arrived, which keep it while `hurrying`. */
  const loaded = useRef(new Set<string>());

  /** The band the marker is in, for `aria-current`. */
  const [activeBand, setActiveBand] = useState(0);
  /** True while a drag on the scale is in progress. The drag places the
   *  marker itself, under the pointer, and the scroll it causes must not
   *  move it. */
  const scrubbing = useRef(false);
  /** Where in the sweep the reader was at the last scroll, so a relayout can
   *  put them back there. */
  const lastPosition = useRef<number | null>(null);

  /**
   * Put the rows around the viewport into the document.
   *
   * Ordinary scrolling calls this on every event and it does nothing until the
   * viewport has come within half an OVERSCAN of the edge of what is rendered;
   * then it renders a full OVERSCAN either side. `force` recomputes regardless,
   * for a relayout, whose row numbers mean different rows.
   */
  const updateSpan = useCallback(
    (force: boolean) => {
      const list = listRef.current;
      if (!list || !layout) return;
      const { rows, pitch } = layout;
      const viewport = window.innerHeight;
      const top = -list.getBoundingClientRect().top;
      const rowAt = (y: number) => Math.min(rows.length, Math.max(0, Math.floor(y / pitch)));
      setSpan((span) => {
        const needFirst = rowAt(top - (viewport * OVERSCAN) / 2);
        const needLast = rowAt(top + viewport + (viewport * OVERSCAN) / 2) + 1;
        if (!force && span.first <= needFirst && span.last >= Math.min(rows.length, needLast)) {
          return span;
        }
        return {
          first: rowAt(top - viewport * OVERSCAN),
          last: Math.min(rows.length, rowAt(top + viewport * (1 + OVERSCAN)) + 1),
        };
      });
    },
    [layout],
  );

  /**
   * Where in the sweep the page is, read off the scroll position alone.
   *
   * The colour scale is this page's scrollbar, and it maps the way a scrollbar
   * does: the top of the page is the first photograph and the bottom of the
   * page the last, evenly in between. The probe it implies starts at the top
   * of the ribbon, passes the middle of the viewport halfway down and ends at
   * the bottom of the ribbon.
   *
   * It used to be the photograph at the middle of the viewport, which is the
   * better answer in the middle of the page and cannot reach either end: the
   * first and last half-screen of photographs never sit there, so a drag to
   * the end of White landed the page on the last screen and the marker then
   * read it back as Grey. Mapped like a scrollbar, a drag and the marker are
   * exact inverses everywhere, which is what lets the marker stay under the
   * pointer through a drag and stay put when the pointer lets go.
   */
  const positionNow = useCallback((): number | null => {
    if (!layout) return null;
    const range = document.documentElement.scrollHeight - window.innerHeight;
    const along = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    return positionAtOffset(layout.rows, along * layout.height, layout.pitch);
  }, [layout]);

  /** Scroll to `position`: the inverse of `positionNow`. Instant, because
   *  it is called on every pointer move of a drag and has to keep up with it;
   *  a smooth scroll would still be travelling when the next one arrived. */
  const scrollToPosition = useCallback(
    (position: number) => {
      if (!layout) return;
      const range = document.documentElement.scrollHeight - window.innerHeight;
      if (range <= 0) return;
      const along = offsetOfPosition(layout.rows, position, layout.pitch) / layout.height;
      window.scrollTo({ top: along * range, behavior: "instant" });
    },
    [layout],
  );

  /** Draw the marker at `position`. Writes to the DOM node, never to state:
   *  the alternative is a re-render of every rendered tile on every scroll
   *  event to move one element two pixels.
   *
   *  It asks each segment where it is drawn instead of computing
   *  `position / total`, because the segments carry a `min-width` so the
   *  small bands can be hit, and that widens pink and white well past their
   *  share and pushes everything after them to the right. */
  const placeMarker = useCallback(
    (position: number) => {
      const marker = progressRef.current;
      const strip = stripRef.current;
      if (!marker || !strip) return;
      const segments = strip.querySelectorAll<HTMLElement>("button");
      const width = strip.clientWidth;
      if (segments.length !== marks.length || width === 0) return;
      const at = bandAt(marks, position);
      const segment = segments[at];
      const left = segment.offsetLeft + alongBand(marks[at], position) * segment.offsetWidth;
      marker.style.left = `${Math.min(100, Math.max(0, (left / width) * 100))}%`;
      setActiveBand(at);
    },
    [marks],
  );

  /** The position in the sweep under a pointer at `clientX` on the scale. */
  const positionAtPointer = useCallback(
    (clientX: number): number | null => {
      const strip = stripRef.current;
      if (!strip) return null;
      const segments = strip.querySelectorAll<HTMLElement>("button");
      if (segments.length !== marks.length || marks.length === 0) return null;
      const x = clientX - strip.getBoundingClientRect().left;
      let at = 0;
      while (at < marks.length - 1 && x >= segments[at].offsetLeft + segments[at].offsetWidth) {
        at++;
      }
      const segment = segments[at];
      const along = segment.offsetWidth > 0 ? (x - segment.offsetLeft) / segment.offsetWidth : 0;
      return positionInBand(marks[at], along);
    },
    [marks],
  );

  const updateProgress = useCallback(() => {
    const position = positionNow();
    if (position === null) return;
    lastPosition.current = position;
    if (!scrubbing.current) placeMarker(position);
  }, [positionNow, placeMarker]);

  /** Move the page to the point of the scale under the pointer. */
  const scrubTo = (clientX: number) => {
    const position = positionAtPointer(clientX);
    if (position === null) return;
    placeMarker(position);
    scrollToPosition(position);
  };

  const endScrub = () => {
    if (!scrubbing.current) return;
    scrubbing.current = false;
    updateProgress();
  };

  // Once per layout: the first, which replaces the server's fallback, and
  // every one after a resize. A resize re-packs every row, so the same scroll
  // offset is somewhere else in the sweep; the reader is put back where they
  // were before the rows are rendered for it.
  useLayoutEffect(() => {
    if (!layout) return;
    if (lastPosition.current !== null) scrollToPosition(lastPosition.current);
    updateSpan(true);
    updateProgress();
  }, [layout, scrollToPosition, updateSpan, updateProgress]);

  useEffect(() => {
    let lastY = window.scrollY;
    let lastTime = performance.now();
    let settle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      const now = performance.now();
      const y = window.scrollY;
      // Pixels per millisecond since the last event. A single jump after a
      // pause reads slow, which is right: its destination is worth loading.
      const speed = Math.abs(y - lastY) / Math.max(1, now - lastTime);
      lastY = y;
      lastTime = now;
      if (speed > window.innerHeight / GLIMPSE_MS) {
        setHurrying(true);
        clearTimeout(settle);
        settle = setTimeout(() => setHurrying(false), GLIMPSE_MS);
      }
      updateSpan(false);
      updateProgress();
    };
    const onResize = () => {
      updateSpan(false);
      updateProgress();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      clearTimeout(settle);
      setHurrying(false);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [updateSpan, updateProgress]);

  // Arrowing through the lightbox can walk off the rows in the document, and
  // the morph back into the strip on close needs the tile to be there. The
  // lightbox scrolls a tile it can find into view itself; one it cannot find
  // is scrolled to here, which renders it. Instant, since the lightbox covers
  // the page.
  useEffect(() => {
    if (!isModalOpen || currentImageIndex >= total) return;
    if (document.getElementById(photos[currentImageIndex].id)) return;
    scrollToPosition(currentImageIndex + 0.5);
  }, [isModalOpen, currentImageIndex, total, photos, scrollToPosition]);

  // Clamped because a relayout renders once with the previous layout's span
  // before the layout effect replaces it, and a narrower window has more rows.
  const firstRow = layout ? Math.min(span.first, layout.rows.length) : 0;
  const lastRow = layout ? Math.min(span.last, layout.rows.length) : 0;
  const firstTile = layout ? (layout.rows[firstRow]?.start ?? total) : 0;
  const endTile = layout
    ? lastRow > firstRow
      ? layout.rows[lastRow - 1].end
      : firstTile
    : Math.min(FIRST_PAINT, total);
  const rendered = useMemo(() => tiles.slice(firstTile, endTile), [tiles, firstTile, endTile]);

  const url = "photography/spectrum";

  return (
    <Layout
      title="Photography by Hue – Rico Trebeljahr"
      description={`All ${formatCount(total)} photographs in one strip, ordered by the mean hue of their pixels — red through gold, green, teal and blue, back round to red.`}
      url={`/${url}`}
      image="/assets/blog/photography.png"
      imageAlt="a high quality rendering of an old film camera"
      keywords={["photography", "colour", "color", "hue", "spectrum", "gallery", "photos"]}
      fullScreen={true}
    >
      <main className="mx-auto max-w-5xl px-3 pt-5 pb-20">
        {/* The crumb is left at "Spectrum" rather than relabelled to match the
            h1: it is the URL segment, and a breadcrumb that disagrees with the
            address bar is a small lie a reader catches when they copy the link. */}
        <Header breadcrumbs={{ path: url }} title="Spectrum" />

        {/* ---- the colour scale ------------------------------------------
            One control, doing three jobs. It shows how much of the sweep each
            colour takes up — green holds 656 photographs and pink 3, and
            seeing that is half of what the page has to say about this archive
            — it shows where the reader is, and it is the page's scrollbar:
            press anywhere on it to go there, or drag along it to run through
            the sweep. See `positionNow` for how it maps.

            There used to be a row of labelled chips underneath for the
            jumping, because a band drawn honestly to scale makes pink about
            3px wide on a 2,000px screen and nobody can hit that. The chips
            were a second copy of the same eleven destinations taking up a
            third of the first screen, so they are gone and the band carries
            a `min-width` instead: every segment is at least wide enough to
            press, and the ones big enough to be drawn to scale still are. The
            distortion is confined to the bands too small to read anyway.

            Labels live in `title` and `aria-label` rather than on the strip.
            Eleven words will not fit across it at any width, and the colour
            is the label for anyone who can see it.

            Sticky, because it is the only navigation on a page this tall:
            parked at the top of the document it would be useful for one
            screen and useless for the rest. `top-15` clears the navbar above
            it, whose bottom edge measures 60px. The backdrop is opaque rather
            than blurred — tiles scrolling under a translucent bar drag their
            colours through the swatches, and the swatches are the one thing
            here that has to stay trustworthy. z-20 keeps it over the ribbon
            and well under the navbar's z-999.

            `not-prose` because <body> is a prose container: without it the
            typography plugin puts list markers and margins on every child and
            the row stops being a row. */}
        <div className="not-prose sticky top-15 z-20 mb-6 bg-white pt-3 pb-3 dark:bg-gray-900">
          {/* The pointer is handled here rather than on the segments, and
              captured on the way down, so a drag keeps scrolling when it
              leaves the strip and a press is handled once, as the drag's
              first step. `touch-none` gives a finger on the strip to the drag
              instead of to page scrolling. */}
          <div
            ref={stripRef}
            onPointerDown={(event) => {
              if (event.button !== 0 || !layout) return;
              event.currentTarget.setPointerCapture(event.pointerId);
              scrubbing.current = true;
              scrubTo(event.clientX);
            }}
            onPointerMove={(event) => {
              if (scrubbing.current) scrubTo(event.clientX);
            }}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
            onLostPointerCapture={endScrub}
            className="relative flex h-7 w-full touch-none select-none overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/10"
          >
            {marks.map((mark, i) => (
              <button
                key={mark.key}
                type="button"
                onClick={(event) => {
                  // Enter or Space on a focused segment, which has no position
                  // to read, goes to the band's start. A pointer press arrives
                  // with a non-zero `detail`, and the strip has handled it.
                  if (event.detail !== 0) return;
                  scrollToPosition(mark.index);
                }}
                title={`${mark.label} — ${formatCount(mark.count)} photographs`}
                aria-label={`Jump to ${mark.label}, ${formatCount(mark.count)} photographs`}
                aria-current={i === activeBand ? "true" : undefined}
                style={{
                  // A ramp rather than a block. Each segment runs from the
                  // midpoint it shares with the band before it to the one it
                  // shares with the band after, so neighbours meet at the
                  // same colour and the eleven of them read as one gradient.
                  // Done per segment because a minimum width means they are
                  // not proportional, so no single gradient on the container
                  // could be told where the seams fall.
                  background: segmentGradient(
                    mark.fill,
                    marks[i - 1]?.fill ?? null,
                    marks[i + 1]?.fill ?? null,
                  ),
                  flexGrow: mark.count,
                  flexBasis: 0,
                }}
                className={clsx(
                  // 28px, the smallest a segment can be and still take a
                  // press reliably. Under the 44px a tap target wants, which
                  // is the compromise a strip makes: 44px of height for a
                  // control that is 11 slivers wide is not a strip any more.
                  "block h-full min-w-7 cursor-pointer",
                  // The focus ring goes inside: the strip clips its own
                  // overflow, so an outset ring on a segment is invisible.
                  "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset",
                  // Nothing marks the band the reader is in, and hovering
                  // does not brighten one either. A lightened slice of a
                  // continuous ramp reads as a seam where there is none, and
                  // the ramp is the thing the strip exists to show. The
                  // marker already says where they are, to the photograph
                  // rather than to the band. `aria-current` carries the band
                  // for anyone not looking at the colours.
                )}
              />
            ))}
            {/* Where the reader is in the sweep. Moved by `placeMarker`
                writing to this node directly. `pointer-events-none` so it
                never swallows a press meant for the band underneath it. */}
            <span
              ref={progressRef}
              aria-hidden
              className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-white ring-1 ring-black/40"
              style={{ left: "0%" }}
            />
          </div>
        </div>

        {/* ---- the ribbon ------------------------------------------------
            One row height for every tile, set as a custom property on the list
            so each tile can derive its own width from it in CSS. That is what
            lets the height be responsive at all: with the width baked into an
            inline style the three breakpoints would need three widths per tile.

            The list is as tall as the whole sweep, and holds only the rows
            near the viewport: `paddingTop` stands in for the rows above them
            and the fixed height for the rows below. `content-start` keeps the
            rendered rows packed at the top of the space left, instead of
            spread out to fill it.

            Where the rows break is decided in `layout` above, not by the
            browser, and every tile in a row gets its share of it as a
            percentage basis, so the row closes exactly. The browser's own
            wrap is greedy and only stretches; it used to run here with each
            tile capped at 1.35x its width, and a row that needed more than
            that to close stayed short, leaving holes down the right edge.
            The class basis below is the natural width, which is what the
            tiles use before the ribbon has been measured and in a short last
            row. `flex-grow: <its ratio>` hands out the ROW_SLACK and, before
            measuring, the whole leftover.

            `min-w-0` because a flex item will not shrink below its content
            by default, and an <img> without a `src` — every tile the page is
            moving too fast to load — takes its `width` attribute as that
            content. A squeezed tile then no longer fits its row, wraps, and
            shifts every row below it by a tile until the photographs arrive.
            `overflow-anchor: none` because the browser's scroll anchoring
            answers any such shift by scrolling the page, and this page
            places its rows itself.

            The `after:` filler is what keeps a short last row short. It is
            the last flex item, so it only ever lands on the last line, and
            its enormous grow takes that line's leftover instead of the
            tiles. On a full row it does not fit at all — its 8px basis is
            more than ROW_SLACK — and wraps onto an empty line of its own.

            The tiles are under the 44px minimum a tap target wants, which is
            the cost of a ribbon: frames big enough to tap comfortably are too
            big to read as a sweep. Tapping opens the lightbox, which is
            forgiving about a near miss, and the scale above is the
            full-width control for the navigation that matters. */}
        <div className="not-prose">
          {/* `start` so the list numbering matches the position in the sweep,
              which is what the tile labels announce. */}
          <ol
            ref={listRef}
            aria-label="Photographs ordered by colour"
            start={firstTile + 1}
            style={
              layout
                ? { height: layout.height - TILE_GAP, paddingTop: firstRow * layout.pitch }
                : undefined
            }
            className="flex flex-wrap content-start gap-px [overflow-anchor:none] [--ribbon-h:100px] after:basis-2 after:grow-[1000000] sm:[--ribbon-h:140px] lg:[--ribbon-h:180px]"
          >
            {rendered.map((tile) => {
              const show = !hurrying || loaded.current.has(tile.id);
              return (
                <li
                  key={tile.id}
                  style={
                    { "--ar": tile.ratio, flexBasis: layout?.bases[tile.index] } as CSSProperties
                  }
                  className="h-[var(--ribbon-h)] min-w-0 shrink-0 grow-[var(--ar)] basis-[calc(var(--ribbon-h)*var(--ar))]"
                >
                  <button
                    type="button"
                    onClick={(event) => openModal(tile.index, event)}
                    aria-label={tile.label}
                    className="block h-full w-full cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {/* biome-ignore lint/performance/noImgElement: next/image renders a wrapper span and a loader per tile; across the rows in the document that machinery costs more than the plain element, and every URL the loader would build is already available from nextImageUrl */}
                    <img
                      id={tile.id}
                      src={show ? tile.src : undefined}
                      srcSet={show ? tile.srcSet : undefined}
                      sizes={tile.sizes}
                      alt=""
                      width={tile.width}
                      height={180}
                      loading="lazy"
                      decoding="async"
                      onLoad={() => loaded.current.add(tile.id)}
                      // The photograph's own mean colour until it arrives,
                      // so a fast pass through the sweep still reads as the
                      // sweep rather than as grey boxes.
                      style={{ backgroundColor: tile.tint }}
                      className="h-full w-full object-cover"
                    />
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <CustomLightBox {...lightbox} photos={photos} />
        <ToTopButton />
      </main>
    </Layout>
  );
}

export async function getStaticProps(): Promise<{ props: Props }> {
  // The whole archive is shipped in one set of props, which is unusual for this
  // repo — the largest gallery page ships 572 photos. Measured: 4,359 entries of
  // src, width and height serialise to 373 KB, which the paths' shared prefixes
  // compress to 45 KB gzipped and 33 KB brotli. Splitting the sweep across
  // paginated routes was the alternative and it costs the thing the page is for:
  // a reader who jumps to teal and keeps scrolling would hit a page boundary
  // mid-gradient. width and height cannot be dropped either — the lightbox
  // sizes its slide from them.
  //
  // Imported here rather than at the top of the file. Next strips
  // getStaticProps and its exclusive imports out of the client bundle, but this
  // chain reaches src/content/photography-colors.json and the 2.8 MB
  // metadata.json, so the import is put somewhere it provably cannot follow the
  // page into the browser instead of trusting the transform to notice.
  const { entryFor, imagesBySpectrum, primaryFamily } = await import("src/lib/photographyColors");
  const { COLOR_BUCKETS } = await import("src/lib/colorBuckets.mjs");

  const images = imagesBySpectrum();

  // The marks read the band straight off each photo's primary family, which is
  // the same key `imagesBySpectrum` bands by, so a mark cannot point at a
  // stretch that holds something else.
  //
  // This used to derive the band from the photo's mean hue angle instead, and
  // that is exactly what made the page unreadable: for 24% of photos the wedge
  // their angle falls in is not the family they belong to, so the labels
  // promised a colour the tiles under them did not have. Membership is the
  // honest key — it is prior-normalised and thresholded, so it already means
  // "unusually this colour for this archive".
  const counts = new Map<ColorBucketId, number>();
  const firstIndex = new Map<ColorBucketId, number>();

  images.forEach((image, index) => {
    // `primaryFamily` and not `buckets[0]`, and not a second copy of the rule
    // either: this has to be the exact function `imagesBySpectrum` banded the
    // strip with. The two disagreed once — the marks read the score-ordered
    // `buckets[0]` while the ribbon ordered by strength — and the result was a
    // scale whose labels pointed at the wrong stretches entirely, blue claiming
    // to start at photo 650 when its band began at 3,088.
    const band = primaryFamily(image.src);
    counts.set(band, (counts.get(band) ?? 0) + 1);
    if (!firstIndex.has(band)) firstIndex.set(band, index);
  });

  // Sorted by where each band actually starts rather than by COLOR_BUCKETS
  // order, because the two differ at the tail: the ring lists white, grey,
  // black, while the tail is laid out by lightness, so it runs black, grey,
  // white. Sorting on `index` lets the scale describe the strip instead of
  // describing the ring.
  //
  // Black, grey and white are ordinary marks now. They used to be lumped into
  // one "No hue" chip, which was fair when it held the 135 photos with no
  // measurable hue at all, and stopped being fair once MIN_VISIBLE_STRENGTH
  // started filing photos there for having too little colour to name rather
  // than none: 725 photos is too many to hide behind a label that says they
  // are all the same, and a pale hazy ridgeline is a thing a reader might
  // actually be looking for.
  const marks: SpectrumMark[] = COLOR_BUCKETS.filter((bucket) => firstIndex.has(bucket.id))
    .map((bucket) => ({
      key: bucket.id,
      label: bucket.label,
      fill: bucket.swatch,
      index: firstIndex.get(bucket.id) ?? 0,
      count: counts.get(bucket.id) ?? 0,
    }))
    .sort((a, b) => a.index - b.index);

  // Each photo's measured mean colour, in OKLCh because that is what the bake
  // measures in. The hue is the one of the family the photo is filed under,
  // not the whole-frame mean, which for a picture of two colours is a third
  // colour it does not contain. Roughly 20 bytes a photo.
  const tints = images.map((image) => {
    const entry = entryFor(image.src);
    if (!entry) return "transparent";
    const hue = entry.familyHue[primaryFamily(image.src)] ?? entry.hue ?? 0;
    return `oklch(${(entry.lightness * 100).toFixed(1)}% ${entry.chroma.toFixed(3)} ${hue.toFixed(0)})`;
  });

  return {
    props: { images, tints, marks },
  };
}

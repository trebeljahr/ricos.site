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
import { ribbonRows } from "src/lib/utils/ribbonRows";
import { fractionAcross, photoAtFraction, segmentGradient } from "src/lib/utils/spectrumScale";
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
   *  prev/next — not the position in the revealed window. */
  index: number;
  /** Fallback src for a browser that ignores `srcSet`, at the smallest
   *  variant. */
  src: string;
  srcSet: string;
  sizes: string;
  /** Layout aspect ratio after clamping: the flex-grow factor and the
   *  multiplier the basis and max-width are derived from in CSS. */
  ratio: number;
  /** Intrinsic width attribute, paired with the constant 180px height. Only
   *  there to reserve the right box before the bytes arrive. */
  width: number;
  label: string;
};

/**
 * Photos revealed per step, and the first step's size.
 *
 * Sized from the measured ribbon geometry rather than picked round. Across the
 * 4,359 photos the mean tile is 1.06x as wide as it is tall once the aspect
 * ratio is clamped (see RATIO_MIN/RATIO_MAX) — this archive is portrait-heavy,
 * 2,412 portrait frames against 1,943 landscape — so at the smallest row height
 * of 100px the mean tile is 106px wide and a full 1000px-wide row holds about
 * nine of them.
 *
 * The number has to be big enough that appending one chunk pushes the sentinel
 * clear out of the observer's 400px rootMargin, otherwise the sentinel never
 * stops intersecting, IntersectionObserver never fires again (it notifies on
 * threshold *crossings*, not continuously) and the reader is stranded at the
 * bottom of the strip. The binding case is the widest container at the shortest
 * row, where a chunk buys the fewest pixels: at 100px on a 1000px container,
 * 38 photos already clear 400px.
 *
 * It was 700, sized when the rows were 48-80px. At 100-180px the same count
 * buys 2.25x the pixels and 2.25x the bytes, because the taller tiles also pull
 * larger variants — a chunk that used to be a reasonable prefetch became most
 * of a phone's data budget before the reader had scrolled anything. 300 keeps
 * an eightfold margin over the 38 the sentinel needs (32 rows and 3,190px at
 * the worst breakpoint) and cuts the first paint to well under half. Fifteen
 * chunks cover the whole archive.
 */
const CHUNK = 300;

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
export default function PhotographySpectrumPage({ images, marks }: Props) {
  const total = images.length;

  const photos = useMemo(() => images.map(addIdAndIndex), [images]);

  /**
   * Every tile's markup-ready strings, built once per props change.
   *
   * Memoized for the same reason GalleryPage memoizes its srcSet, only more
   * so, because this page re-renders far more often than a gallery does. The
   * lightbox's current slide is state in `useCustomLightbox`, which this
   * component calls, so every arrow press in the lightbox — and every chunk
   * the observer appends — re-renders the whole revealed window. That window
   * reaches all 4,359 photos once the reader has scrolled the sweep, and
   * building the strings in the map body meant 4,359 template labels and 4,359
   * `srcSet` joins over 17,436 `nextImageUrl` calls per keypress, to produce
   * byte-identical attributes each time.
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
          // The label, not the alt text, carries the meaning here. Alt from the
          // filename would read "DSC04727" 4,359 times over, which is worse
          // than nothing, so the image is marked decorative and the button says
          // what it opens.
          label: `Open photo ${formatCount(photo.index + 1)} of ${formatCount(total)}, from ${tripOf(photo.src)}`,
        };
      }),
    [photos, total],
  );

  const lightbox = useCustomLightbox({ photos });
  const { openModal, currentImageIndex, isModalOpen } = lightbox;

  /** The half-open window of photos currently in the document. Both ends move:
   *  scrolling down grows `end`, scrolling up grows the window backwards by
   *  lowering `start`, and a chip jump drops a fresh CHUNK anywhere in the
   *  sweep and lets the reader scroll out of it in either direction. */
  const [window_, setWindow] = useState({ start: 0, end: Math.min(CHUNK, total) });
  const { start, end } = window_;

  const ribbonRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  /** Set by `seek`, consumed by the layout effect that does the scrolling. */
  const pendingSeek = useRef(false);
  /** True from the moment a jump is requested until its scroll has landed, so
   *  the page's own movement cannot be mistaken for the reader's. */
  const seeking = useRef(false);
  const lastY = useRef(0);
  const scrollingUp = useRef(false);

  const hasMore = end < total;
  const hasPrevious = start > 0;

  /** The tile the reader's position is measured against across a prepend, and
   *  where it sat when the prepend was requested. Null when the pending render
   *  is not a prepend. Read once, in the layout effect below. */
  const prependAnchor = useRef<{ id: string; top: number } | null>(null);

  /** Same guard as InfiniteScrollGallery: two intersections can arrive inside
   *  one frame, while React has not re-rendered the moved sentinel yet. */
  const holdLoading = useCallback(() => {
    loadingRef.current = true;
    setTimeout(() => {
      loadingRef.current = false;
    }, 100);
  }, []);

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    holdLoading();
    setWindow((w) => (w.end >= total ? w : { ...w, end: Math.min(total, w.end + CHUNK) }));
  }, [holdLoading, total]);

  const loadPrevious = useCallback(() => {
    if (loadingRef.current || seeking.current) return;
    // Only ever in response to the reader scrolling up. Without this the page
    // loads backwards whenever the top of the ribbon happens to be near the
    // viewport, which is exactly where a jump leaves it — so every jump
    // immediately pulled in the chunk before its target and shoved the reader
    // down by its height.
    if (!scrollingUp.current) return;
    holdLoading();
    // Recorded here rather than in the updater, which React may run twice.
    // The anchor is the window's current first tile, which `loadPrevious` only
    // ever runs while the reader is near, and which is still in the document
    // after the prepend — just further down it.
    const anchorId = tiles[start]?.id;
    const element = anchorId ? document.getElementById(anchorId) : null;
    prependAnchor.current = element
      ? { id: element.id, top: element.getBoundingClientRect().top }
      : null;
    setWindow((w) => (w.start <= 0 ? w : { ...w, start: Math.max(0, w.start - CHUNK) }));
  }, [holdLoading, start, tiles]);

  /**
   * Hold the reader's place when rows are inserted above them.
   *
   * Without this the page leaps the instant an upward load fires. Browsers
   * have scroll anchoring for exactly this, but Safari does not implement it,
   * so the correction is done by hand.
   *
   * It is measured against one tile rather than against the document's height,
   * and that distinction is the whole of it. The first attempt compared
   * `scrollHeight` before and after and scrolled by the difference, which is
   * correct only if the existing rows keep their positions relative to each
   * other. They do not: the ribbon is a justified `flex-wrap`, so inserting
   * 300 tiles above re-packs every row below them. Photos move between rows,
   * row heights stay fixed but row *contents* shift, and the height delta ends
   * up describing no particular photo's displacement. Correcting by it left
   * the reader somewhere near where they were, differently wrong on every
   * load, which is what jumpy means here.
   *
   * Measuring one real element survives the reflow, because it asks the
   * question that actually matters: where did the thing the reader was looking
   * at go?
   *
   * `useLayoutEffect` and not `useEffect` because it has to run before the
   * browser paints. In an effect the reader sees one frame at the wrong offset,
   * which reads as a jolt at precisely the moment they are scrolling.
   *
   * `window_` is in the deps although the body never reads it, and the linter
   * is wrong to call it redundant: it is the signal that the window move has
   * been committed. The effect has to run once per move, and the window object
   * is the only thing that changes between the render that schedules one and
   * the render that finishes it. Drop it and the correction runs on the first
   * commit only, so every upward load after the first one jolts.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: window_ is the commit signal, see above
  useLayoutEffect(() => {
    // A jump scrolls here, after the new window is in the document, and never
    // in `seek` itself. Scrolling from the event handler aimed at the ribbon's
    // old geometry — the rows it was measuring were about to be replaced — so
    // the page started moving towards a position that stopped existing one
    // render later.
    if (pendingSeek.current) {
      pendingSeek.current = false;
      prependAnchor.current = null;
      ribbonRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
      // The reader is now at the top of the new window and has not scrolled.
      lastY.current = window.scrollY;
      scrollingUp.current = false;
      // Released immediately, not on the next animation frame. The frame was
      // the tidier-looking way to wait out the scroll event this jump is about
      // to emit, and it was wrong: requestAnimationFrame does not run while a
      // tab is not being composited, so a jump made in a background tab left
      // this flag stuck on and killed upward loading for the rest of the
      // visit. Nothing needs the delay anyway — the scroll this jump causes
      // arrives with `window.scrollY` already equal to `lastY`, and the
      // handler ignores an event that reports no movement.
      seeking.current = false;
      return;
    }

    const anchor = prependAnchor.current;
    if (anchor === null) return;
    prependAnchor.current = null;
    const element = document.getElementById(anchor.id);
    if (!element) return;
    const delta = element.getBoundingClientRect().top - anchor.top;
    if (delta !== 0) window.scrollBy(0, delta);
  }, [window_]);

  /**
   * Scroll direction, and the upward load.
   *
   * This is a scroll listener rather than a second IntersectionObserver, and
   * the reason is a property of the API rather than a preference:
   * IntersectionObserver reports *crossings*, not states. A sentinel at the top
   * of the ribbon is already intersecting the moment a jump lands, so it
   * reports once, and if that report is ignored — which it must be, since the
   * reader has not asked for anything — it never reports again while it stays
   * on screen. Scrolling up from a jump would then load nothing at all.
   *
   * Reading position on scroll has neither problem: it is a state, so it is
   * still true the second time it is asked.
   */
  /** Put the marker where the reader is. Writes to the DOM node, never to
   *  state.
   *
   *  Two things here are easy to get wrong and were.
   *
   *  It measures against the middle of the viewport rather than its top edge.
   *  The top edge is the first row *partly* on screen, which is behind
   *  whatever the reader is actually looking at by half a screen of photos,
   *  and the marker trailed by that much the whole way down.
   *
   *  And it places the marker by measuring the drawn segments instead of
   *  computing `index / total`. Those agreed while the strip was drawn purely
   *  to scale; they stopped agreeing the moment segments got a `min-width` so
   *  the small bands could be clicked, because that widens pink and white well
   *  past their share and pushes everything after them to the right. The
   *  arithmetic answer stayed where a to-scale strip would have put it, which
   *  is left of the band it was naming — the marker sat in pink while the
   *  photographs on screen were grey. Asking the band where it is cannot drift
   *  from where it is. */
  const updateProgress = useCallback(() => {
    const marker = progressRef.current;
    const ribbon = ribbonRef.current;
    const strip = stripRef.current;
    if (!marker || !ribbon || !strip || total === 0) return;

    const list = ribbon.querySelector("ol");
    const items = list?.children;
    if (!items || items.length === 0) return;

    const viewport = window.innerHeight || document.documentElement.clientHeight || 0;
    const probe = viewport / 2;

    // Which photograph is at the middle of the screen, found by bisecting the
    // tiles for the first one whose bottom edge is below the probe.
    //
    // WHY THIS IS NOT ARITHMETIC AND NOT A HIT TEST
    // ---------------------------------------------
    // It was arithmetic first — how far down the ribbon the probe sits, times
    // how many photos the ribbon holds. That is only right while every row
    // holds the same number of tiles and the ribbon's height matches its
    // contents, and neither survives loading: rows hold between about six and
    // fourteen tiles depending on how many portraits land together, and a
    // chunk arriving changes the ribbon's height a frame before React has
    // said the window grew.
    //
    // Then it was `elementFromPoint`, with the arithmetic kept as a fallback
    // for when nothing was under the probe — the pixel gap between tiles, the
    // strip of page past the last row, the lightbox when it is open. That was
    // worse in the way that is hardest to see: two estimators disagreeing
    // with each other, so the marker was exact most of the time and quietly
    // wrong the rest, and the difference looked like drift.
    //
    // Bisection has no gaps and no second opinion. Tiles are in sweep order
    // in the DOM and rows share an edge, so the first tile whose bottom is
    // past the probe is in the row the reader is looking at, always. Eleven
    // reads for 1,500 tiles, on a layout the browser has already computed.
    let lo = 0;
    let hi = items.length - 1;
    let found = hi;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if ((items[mid] as HTMLElement).getBoundingClientRect().bottom <= probe) {
        lo = mid + 1;
      } else {
        found = mid;
        hi = mid - 1;
      }
    }
    const index = Number((items[found] as HTMLElement).dataset.index);
    if (!Number.isFinite(index)) return;

    const segments = strip.querySelectorAll<HTMLElement>("button");
    const width = strip.clientWidth;
    if (segments.length !== marks.length || width === 0) return;

    let at = marks.length - 1;
    for (let i = 0; i < marks.length; i++) {
      if (index < marks[i].index + marks[i].count) {
        at = i;
        break;
      }
    }
    const segment = segments[at];
    const band = marks[at];
    const fraction = band.count > 0 ? (index - band.index) / band.count : 0;
    const left = segment.offsetLeft + Math.min(1, Math.max(0, fraction)) * segment.offsetWidth;
    marker.style.left = `${Math.min(100, Math.max(0, (left / width) * 100))}%`;
  }, [total, marks]);

  // After every committed window change, so a jump moves the marker before
  // the reader has scrolled anything. Keyed on the window rather than on the
  // callback: `updateProgress` reads only the DOM now, so its identity no
  // longer changes when the window does, and clicking the same band twice or
  // going to the top from an already-at-the-top window would otherwise commit
  // a new layout with a stale marker over it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: window_ is the commit signal
  useEffect(updateProgress, [window_, updateProgress]);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      // First, and unconditionally. Both guards below used to sit in front of
      // it, and between them they covered most of the ways the page moves
      // without the reader scrolling: a jump held `seeking` and returned, and
      // the to-top button set `lastY` to the offset it was about to scroll to,
      // so the scroll it caused arrived reporting no movement and returned
      // too. In both cases the marker kept whatever position it had before.
      updateProgress();
      // The page's own scrolling, during a jump, is not the reader moving.
      if (seeking.current) {
        lastY.current = y;
        return;
      }
      if (y === lastY.current) return;
      scrollingUp.current = y < lastY.current;
      lastY.current = y;
      if (!scrollingUp.current || !hasPrevious) return;
      // Measured only while scrolling up and only while there is something
      // above to load, so the layout read costs nothing on the common path.
      // No requestAnimationFrame throttle around it: rAF does not run while a
      // tab is not being composited, which would leave the upward load dead in
      // exactly the situations that are hardest to notice. `loadingRef`
      // already stops a burst of events from loading more than one chunk.
      const top = ribbonRef.current?.getBoundingClientRect().top ?? Number.NEGATIVE_INFINITY;
      // Within a screen of the ribbon's first row, which is the only place an
      // upward load can be what the reader wants.
      if (top > -400) loadPrevious();
    };
    // Resizing re-packs every row, so the photo at the middle of the screen
    // changes without a scroll event to announce it.
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateProgress);
    };
  }, [loadPrevious, hasPrevious, updateProgress]);

  /**
   * Jump to a region of the circle.
   *
   * Drops a fresh window at the target instead of revealing everything in
   * between: reaching pink the long way is 4,224 photos, which would put the
   * whole archive in one document and undo the chunking the page is built on.
   *
   * What makes that acceptable is that the window is no longer a dead end. The
   * reader can scroll up out of a jump and the photos before it load, the same
   * way scrolling down loads the ones after, so the sweep stays continuous in
   * both directions from wherever they landed.
   */
  const seek = useCallback(
    (index: number) => {
      seeking.current = true;
      pendingSeek.current = true;
      prependAnchor.current = null;
      setWindow({ start: index, end: Math.min(total, index + CHUNK) });
    },
    [total],
  );

  /**
   * Back to the first photograph.
   *
   * Not a scroll. The window holds a few hundred photos out of 1,950, so the
   * top of the document is only the top of whatever is loaded — from the blue
   * band that is photo 1,264, and the button appeared to stop short of the
   * top because it had in fact arrived at it.
   *
   * Scrolling there properly would mean loading every chunk in between, which
   * is both slow and ugly: a few thousand tiles streaming in under a reader
   * who only wanted to get back to the start. So the window is reset to the
   * beginning and the page jumps, which loads one chunk and nothing else.
   *
   * `seeking` is held across the reset for the same reason every other jump
   * holds it: the scroll it causes must not be read as the reader scrolling
   * up, or the backwards loader undoes the reset on the spot.
   */
  const toTop = useCallback(() => {
    seeking.current = true;
    pendingSeek.current = false;
    prependAnchor.current = null;
    setWindow({ start: 0, end: Math.min(CHUNK, total) });
    window.scrollTo(0, 0);
    lastY.current = 0;
    scrollingUp.current = false;
    seeking.current = false;
  }, [total]);

  // Arrowing forward in the lightbox can walk past the revealed window. Reveal
  // in one jump up to the slide plus a chunk, rather than a chunk per tick, so
  // the morph back into the strip has an element to land on.
  //
  // Gated on the lightbox actually being open, which is the whole correctness
  // of this effect. `currentImageIndex` is not cleared on close — it is what
  // `animateImageBackToGallery` looks the tile up by while the lightbox is
  // exiting — so after any visit to the lightbox it keeps pointing at the last
  // slide viewed, for the rest of the reader's stay on the page. Without the
  // gate the next *seek* re-ran this against that stale index and read it as a
  // slide sitting past the new window: view a photo near the end of the sweep,
  // then jump back to Red, and `currentImageIndex - start + CHUNK` asks for
  // 5,059 photos, so all 4,359 tiles land in the document at once and the
  // chunking this page is built on is gone until a reload. While the lightbox
  // is open the index is live and means what the effect assumes it means.
  useEffect(() => {
    if (!isModalOpen) return;
    if (currentImageIndex >= total) return;
    if (currentImageIndex < end) return;
    setWindow((w) => ({ ...w, end: Math.min(total, currentImageIndex + CHUNK) }));
  }, [isModalOpen, currentImageIndex, end, total]);

  // `hasMore` is in the deps although the effect never reads it, because the
  // sentinel is only in the tree while it is true. Seeking can flip it back from
  // false to true — jump to Pink, which reaches the end of the sweep, then jump
  // back to Red — and that remount produces a *different* DOM node. Without the
  // re-run the observer would still be watching the detached one and the reader
  // would be stranded with 700 photos and no way to load the rest.
  // biome-ignore lint/correctness/useExhaustiveDependencies: hasMore remounts the sentinel; see above
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  const visible = useMemo(() => tiles.slice(start, end), [tiles, start, end]);

  /** The ribbon's width and row height as laid out, which is what the rows
   *  are broken against. Null on the server and in the first client render,
   *  when the tiles fall back to plain flex-wrap justification. */
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);

  // A layout effect so the first measured layout replaces the fallback before
  // the browser paints it. The observer then fires on every chunk too, since
  // the list grows taller, and the comparison keeps those from re-rendering:
  // only a new width or a new row height moves the breaks.
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
   * Each tile's `flex-basis`, as a share of its row: `undefined` leaves the
   * tile on the natural-width basis in its class.
   *
   * A share of 100% rather than a width in pixels, although the pixels are
   * right there in `frame`. The breaks are worked out against one measured
   * width and the browser lays out against the real one, and the two disagree
   * for a frame whenever the page resizes — a scrollbar appearing is enough.
   * Pixel bases a few px too wide for the real row push its last tile onto
   * the next line, and the misfit cascades down the whole ribbon. A share of
   * the row cannot overflow it: at worst, breaks computed for a stale width
   * crop a little more than they would have, until the observer catches up.
   */
  const bases = useMemo(() => {
    if (!frame) return null;
    const ratios = visible.map((tile) => tile.ratio);
    const result: (string | undefined)[] = new Array(visible.length);
    const rows = ribbonRows(
      ratios,
      frame.width - ROW_SLACK,
      frame.height,
      TILE_GAP,
      TRAILING_MAX_STRETCH,
    );
    for (const row of rows) {
      if (row.scale === null) continue;
      let sum = 0;
      for (let i = row.start; i < row.end; i++) sum += ratios[i];
      const reserved = TILE_GAP * (row.end - row.start - 1) + ROW_SLACK;
      for (let i = row.start; i < row.end; i++) {
        result[i] = `calc((100% - ${reserved}px) * ${ratios[i] / sum})`;
      }
    }
    return result;
  }, [visible, frame]);

  /** Mark whose stretch of the sweep the window starts in. */
  const activeKey = useMemo(() => {
    let current: SpectrumMark["key"] | null = marks[0]?.key ?? null;
    for (const mark of marks) {
      if (mark.index <= start) current = mark.key;
    }
    return current;
  }, [marks, start]);

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
            One control, doing both jobs. It shows how much of the sweep each
            colour takes up — green holds 656 photographs and pink 3, and
            seeing that is half of what the page has to say about this archive
            — and it is also how a reader jumps to one.

            There used to be a row of labelled chips underneath for the
            jumping, because a band drawn honestly to scale makes pink about
            3px wide on a 2,000px screen and nobody can hit that. The chips
            were a second copy of the same eleven destinations taking up a
            third of the first screen, so they are gone and the band carries
            a `min-width` instead: every segment is at least wide enough to
            click, and the ones big enough to be drawn to scale still are. The
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
          <div
            ref={stripRef}
            className="relative flex h-7 w-full overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/10"
          >
            {marks.map((mark, i) => {
              const isActive = mark.key === activeKey;
              return (
                <button
                  key={mark.key}
                  type="button"
                  onClick={(event) => {
                    // Where in the band they clicked, not the band's start.
                    // The arithmetic is in src/lib/utils/spectrumScale.ts, on
                    // its own and tested, because it is the kind that is wrong
                    // quietly.
                    const box = event.currentTarget.getBoundingClientRect();
                    seek(photoAtFraction(mark, fractionAcross(box, event.clientX, event.detail)));
                  }}
                  title={`${mark.label} — ${formatCount(mark.count)} photographs`}
                  aria-label={`Jump to ${mark.label}, ${formatCount(mark.count)} photographs`}
                  aria-current={isActive ? "true" : undefined}
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
                    // click reliably. Under the 44px a tap target wants, which
                    // is the compromise a strip makes: 44px of height for a
                    // control that is 11 slivers wide is not a strip any more.
                    "block h-full min-w-7 cursor-pointer",
                    // The focus ring goes inside: the strip clips its own
                    // overflow, so an outset ring on a segment is invisible.
                    "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset",
                    // Nothing marks the band the reader is in. It used to be
                    // brightened, which fought the gradient it sits in — a
                    // lightened slice of a continuous ramp reads as a seam
                    // where there is none, and the ramp is the thing the strip
                    // exists to show. The stripe already says where they are,
                    // to the photograph rather than to the band, so the
                    // highlight was a second, coarser answer to a question
                    // that had a better one. `aria-current` above still
                    // carries it for anyone not looking at the colours.
                    //
                    // Hovering does not brighten a band either, for the same
                    // reason: it cut the same false seam into the ramp under
                    // the pointer. The cursor and the `title` are the
                    // affordance.
                  )}
                />
              );
            })}
            {/* Where the reader is in the sweep.

                This used to be the loaded window — `start` to `end` — which
                was the wrong thing to draw and looked it: the window only ever
                grows as chunks load, so the marker stretched further across
                the strip the longer anyone scrolled, and by the second screen
                it claimed most of the archive was "here". What a reader wants
                from a position indicator is their position.

                Moved by the scroll handler writing to this node directly. Not
                React state: the alternative is a re-render of up to 1,500
                tiles on every scroll event to move one element two pixels.
                `pointer-events-none` so it never swallows a click meant for
                the band underneath it. */}
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
            inline style the three breakpoints would need three widths per tile,
            4,359 times over.

            Measured over the whole archive at a 1000px container: the strip is
            464 rows and about 46,000px tall at the 100px row height, 648 rows at
            140px and 835 rows at 180px. On a 351px phone the 100px height gives
            1,321 rows.

            Where the rows break is decided in `bases` above, not by the
            browser, and every tile in a row gets its share of it as a
            percentage basis, so the row closes exactly. The browser's own
            wrap is greedy and only stretches; it used to run here with each
            tile capped at 1.35x its width, and a row that needed more than
            that to close stayed short, leaving holes down the right edge.
            The class basis below is the natural width, which is what the
            tiles use before the ribbon has been measured and in a short last
            row. `flex-grow: <its ratio>` hands out the ROW_SLACK and, before
            measuring, the whole leftover.

            The `after:` filler is what keeps a short last row short. It is
            the last flex item, so it only ever lands on the last line, and
            its enormous grow takes that line's leftover instead of the
            tiles. On a full row it does not fit at all — its 8px basis is
            more than ROW_SLACK — and wraps onto an empty line of its own.

            The tiles are under the 44px minimum a tap target wants, which is
            the cost of a ribbon: frames big enough to tap comfortably are too
            big to read as a sweep. Tapping opens the lightbox, which is
            forgiving about a near miss, and the chips above are full-size
            targets for the navigation that matters. */}
        {/* scroll-mt-24 so a jump clears the sticky navbar, the same clearance
            the anchored tag sections on /categories use. */}
        <div ref={ribbonRef} className="not-prose scroll-mt-24">
          {/* `start` so the list numbering matches the position in the sweep
              after a jump, which is what the tile labels announce. */}
          <ol
            ref={listRef}
            aria-label="Photographs ordered by colour"
            start={start + 1}
            className="flex flex-wrap gap-px [--ribbon-h:100px] after:basis-2 after:grow-[1000000] sm:[--ribbon-h:140px] lg:[--ribbon-h:180px]"
          >
            {visible.map((tile, i) => (
              <li
                key={tile.id}
                // Read back by `updateProgress`, which asks the browser which
                // tile is under the middle of the viewport rather than working
                // it out from the ribbon's height.
                data-index={tile.index}
                style={{ "--ar": tile.ratio, flexBasis: bases?.[i] } as CSSProperties}
                className="h-[var(--ribbon-h)] shrink-0 grow-[var(--ar)] basis-[calc(var(--ribbon-h)*var(--ar))]"
              >
                <button
                  type="button"
                  onClick={(event) => openModal(tile.index, event)}
                  aria-label={tile.label}
                  className="block h-full w-full cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {/* biome-ignore lint/performance/noImgElement: next/image renders a wrapper span and a loader per tile; at 700 tiles per chunk that machinery costs more than the plain element, and every URL the loader would build is already available from nextImageUrl */}
                  <img
                    id={tile.id}
                    src={tile.src}
                    srcSet={tile.srcSet}
                    sizes={tile.sizes}
                    alt=""
                    width={tile.width}
                    height={180}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full bg-gray-200 object-cover dark:bg-gray-800"
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>

        {hasMore && <div ref={sentinelRef} className="h-px" aria-hidden />}

        <CustomLightBox {...lightbox} photos={photos} />
        <ToTopButton onScrollToTop={toTop} />
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
  const { imagesBySpectrum, primaryFamily } = await import("src/lib/photographyColors");
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

  return {
    props: { images, marks },
  };
}

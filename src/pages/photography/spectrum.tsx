import { CustomLightBox, useCustomLightbox } from "@components/Galleries/useCustomLightbox";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import clsx from "clsx";
import Link from "next/link";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ImageProps } from "src/@types";
import type { ColorBucketId } from "src/lib/colorBuckets.mjs";
import { nextImageUrl } from "src/lib/mapToImageProps";
import { formatCount } from "src/lib/utils/formatCount";
import { addIdAndIndex } from "src/lib/utils/misc";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

/**
 * One stop on the hue scale above the ribbon: the point in the sweep where a
 * hue wedge starts, so a reader can jump to a region of the colour circle.
 */
type SpectrumMark = {
  /** The eight hue wedges use their family id; the neutral tail uses "none". */
  key: ColorBucketId | "none";
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
  chromatic: number;
  achromatic: number;
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
 * 2,412 portrait frames against 1,943 landscape — so at the largest row height
 * of 80px the mean tile is 85px wide and a full 1000px-wide row holds about
 * twelve of them.
 *
 * The number has to be big enough that appending one chunk pushes the sentinel
 * clear out of the observer's 400px rootMargin, otherwise the sentinel never
 * stops intersecting, IntersectionObserver never fires again (it notifies on
 * threshold *crossings*, not continuously) and the reader is stranded at the
 * bottom of the strip. 700 photos is the smallest chunk that clears it at every
 * breakpoint: 36 rows and 1,850px at the 48px row height on a 1000px container,
 * 3,000px at that height on a 351px phone, 4,950px at the 80px height. Seven
 * chunks cover the whole archive.
 */
const CHUNK = 700;

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

const clampRatio = (width: number, height: number) =>
  Math.min(RATIO_MAX, Math.max(RATIO_MIN, width / height));

/** Trip folder out of a metadata key, "assets/photography/<trip>/<file>". */
const tripOf = (src: string) => turnKebabIntoTitleCase(src.split("/")[2] ?? "");

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

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
 * The /photography/colors pages file photos into twelve families. Only eight of
 * those own an arc of the hue circle. Earth is not a hue at all — it is dark,
 * dull orange and gold demoted (see BROWN_MAX_LIGHTNESS in
 * src/lib/colorBuckets.mjs), so its members are scattered through the orange
 * and gold stretches rather than gathered anywhere. White, grey and black have
 * no hue by definition and make up the tail. Labelling them on a hue axis would
 * be a promise the axis cannot keep.
 *
 * WHY MIXED PHOTOS SIT SOMEWHERE SURPRISING
 * -----------------------------------------
 * The order here comes from one number per photo — the mean hue of the whole
 * frame — while the family pages come from per-family vote shares. A photo of a
 * red wall behind green foliage is a member of both families and has a mean hue
 * somewhere in between, so it lands in the gold stretch and appears on both the
 * red and green pages. Neither view is wrong; they answer different questions.
 */
export default function PhotographySpectrumPage({ images, marks, chromatic, achromatic }: Props) {
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
          // --ribbon-h in. These are the unstretched basis widths: row
          // justification can push a tile up to --ribbon-stretch wider, so a
          // stretched tile is at most 35% under-resolved. Declaring the
          // stretched width instead would move most of the archive from the 128
          // variant to the 256 one to sharpen a 60px thumbnail.
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

  /** First photo of the revealed window. Moved only by the hue scale. */
  const [start, setStart] = useState(0);
  /** How many photos after `start` are in the document. */
  const [revealed, setRevealed] = useState(CHUNK);

  const ribbonRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  // `revealed` is allowed to overshoot — the last chunk and a lightbox jump both
  // add a whole CHUNK regardless of what is left. `end` is the clamp and the one
  // number anything else reads, so nothing downstream has to repeat the bound.
  const end = Math.min(total, start + revealed);
  const hasMore = end < total;

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setRevealed((previous) => previous + CHUNK);
    // Same guard as InfiniteScrollGallery: two intersections can arrive inside
    // one frame while React has not re-rendered the moved sentinel yet.
    setTimeout(() => {
      loadingRef.current = false;
    }, 100);
  }, []);

  /**
   * Jump to a region of the circle.
   *
   * This *moves* the window rather than growing it, which is the one real
   * compromise on the page and worth stating plainly: after jumping to teal the
   * reader cannot scroll back up into green, only jump there. The alternative
   * is to reveal everything before the target — 4,686 photos to reach pink —
   * which puts the whole archive in the document and undoes the chunking that
   * makes the page usable at all. Growing upwards instead needs the browser to
   * hold the scroll position while content is inserted above it, and scroll
   * anchoring is a Chrome and Firefox feature that Safari does not implement, so
   * it would silently teleport those readers. A jump that always lands at the
   * top of the strip is predictable on every browser, and the marks plus the
   * step-back button reach every part of the sweep.
   */
  const seek = useCallback((index: number) => {
    setStart(index);
    setRevealed(CHUNK);
    ribbonRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "instant" : "smooth",
      block: "start",
    });
  }, []);

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
    if (currentImageIndex < start + revealed) return;
    setRevealed(currentImageIndex - start + CHUNK);
  }, [isModalOpen, currentImageIndex, start, revealed, total]);

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

  /** Mark whose stretch of the sweep the window starts in. */
  const activeKey = useMemo(() => {
    let current: SpectrumMark["key"] = marks[0]?.key ?? "none";
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
        <Header
          breadcrumbs={{ path: url }}
          title="Spectrum"
          subtitle="Every photograph in the archive, grouped by colour"
        />

        {/* No prose classes: _document.tsx already puts `prose md:prose-lg
            xl:prose-xl` on <body>, so re-declaring `prose` here would reset the
            type scale to the base size on every screen. */}
        <div className="mb-8">
          <p>
            Every one of the {formatCount(total)} photographs, in one strip. The order comes from
            the colour each photo actually reads as, so scrolling walks the circle once: red,
            orange, gold, earth, green, teal, blue, purple, pink. Inside each stretch the photos run
            by hue angle. {achromatic} photographs carry too little colour to place. They sit at the
            end, ordered from darkest to lightest.
          </p>
          <p>
            A pale photo still sits with its colour and still looks pale — the bands thin out at
            their edges rather than cutting off. Click any frame to see it full size.{" "}
            <Link href="/photography/colors">The colour families</Link> are the same data as twelve
            separate pages, each ranked by how much of that colour a photo carries.
          </p>
        </div>

        {/* ---- hue scale -------------------------------------------------
            Two elements, each with one job. The strip shows how much of the
            sweep each hue takes up, which is real information and the reason it
            is drawn to scale: gold holds 1,503 photos and pink 57, and seeing
            that is half of what the page has to say about this archive. The
            chips below do the jumping, at equal width, because pink's honest
            share of the strip is 12px on a 1000px screen and nobody can hit
            that with a thumb. Same split as the wheel on /photography/colors,
            for the same reason.

            `not-prose` because <body> is a prose container: without it the
            typography plugin puts list markers, an inline-start padding and a
            0.5em margin on every <li>, and a flex row of chips or tiles laid out
            inside that is not the layout this file describes. Same guard
            InfiniteScrollGallery wraps itself in. */}
        <div className="not-prose mb-6">
          <div
            aria-hidden
            className="relative flex h-3 w-full overflow-hidden rounded-full ring-1 ring-black/10 dark:ring-white/10"
          >
            {marks.map((mark, i) => (
              <span
                key={mark.key}
                style={{ background: mark.fill, flexGrow: mark.count }}
                // A hairline divider rather than a gap: a gap would show the
                // page background through the strip and break the sweep.
                className={clsx("block h-full", i > 0 && "border-l border-black/10")}
              />
            ))}
            {/* Which slice of the sweep is currently in the document. Grows as
                chunks load and moves when a mark is clicked, so the reader can
                see where they are without a scroll listener. */}
            <span
              className="absolute inset-y-0 bg-white/45 ring-1 ring-white/70 ring-inset motion-safe:transition-all motion-safe:duration-300 dark:bg-white/25"
              style={{
                left: `${(start / total) * 100}%`,
                width: `${((end - start) / total) * 100}%`,
              }}
            />
          </div>

          <ul className="mt-3 grid grid-cols-3 gap-2 text-sm xs:grid-cols-5 sm:grid-cols-9">
            {marks.map((mark) => {
              const isActive = mark.key === activeKey;
              return (
                <li key={mark.key}>
                  <button
                    type="button"
                    onClick={() => seek(mark.index)}
                    aria-current={isActive ? "true" : undefined}
                    className={clsx(
                      "flex min-h-11 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-1 py-1.5 ring-1 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                      isActive
                        ? "font-medium text-gray-900 ring-gray-400 dark:text-gray-50 dark:ring-gray-500"
                        : "text-gray-700 ring-gray-200 hover:ring-gray-400 dark:text-gray-300 dark:ring-gray-700 dark:hover:ring-gray-500",
                    )}
                  >
                    <span
                      aria-hidden
                      className="h-2 w-full rounded-full ring-1 ring-black/15 ring-inset"
                      style={{ background: mark.fill }}
                    />
                    <span className="truncate">{mark.label}</span>
                    <span className="text-xs text-gray-500 tabular-nums dark:text-gray-400">
                      {mark.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {start > 0 && (
          <button
            type="button"
            onClick={() => seek(Math.max(0, start - CHUNK))}
            className="mb-3 cursor-pointer rounded-md px-3 py-2 text-sm ring-1 ring-gray-200 hover:ring-gray-400 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-accent dark:ring-gray-700 dark:hover:ring-gray-500"
          >
            Back {formatCount(CHUNK)} photos
          </button>
        )}

        {/* ---- the ribbon ------------------------------------------------
            One row height for every tile, set as a custom property on the list
            so each tile can derive its own width from it in CSS. That is what
            lets the height be responsive at all: with the width baked into an
            inline style the three breakpoints would need three widths per tile,
            4,359 times over.

            Measured over the whole archive at a 1000px container: the strip is
            223 rows and about 10,700px tall at the 48px row height, 297 rows at
            64px and 370 rows at 80px. On a 351px phone the 48px height gives
            634 rows.

            --ribbon-stretch is how far a tile may be pushed past its natural
            width to justify a row. Every tile is `flex-grow: <its ratio>`, so a
            row's leftover is shared out in proportion and rows end flush on both
            edges. Without a ceiling the last row — which, while chunks are still
            loading, is wherever the reader currently is — would stretch a
            handful of frames across the whole width. 1.35 bounds the crop
            `object-cover` then takes to about a quarter of the frame, and leaves
            a partial row visibly partial rather than distorted.

            The tiles are deliberately under the 44px minimum a tap target
            wants — 36x48px on a phone. A ribbon of touch-sized frames is not a
            ribbon, and /photography/colors reaches every one of these photos at
            a comfortable size, so the small target costs nobody access. */}
        {/* scroll-mt-24 so a jump clears the sticky navbar, the same clearance
            the anchored tag sections on /categories use. */}
        <div ref={ribbonRef} className="not-prose scroll-mt-24">
          {/* `start` so the list numbering matches the position in the sweep
              after a jump, which is what the tile labels announce. */}
          <ol
            aria-label="Photographs ordered by colour"
            start={start + 1}
            className="flex flex-wrap gap-px [--ribbon-h:100px] [--ribbon-stretch:1.35] sm:[--ribbon-h:140px] lg:[--ribbon-h:180px]"
          >
            {visible.map((tile) => (
              <li
                key={tile.id}
                style={{ "--ar": tile.ratio } as CSSProperties}
                className="h-[var(--ribbon-h)] shrink-0 grow-[var(--ar)] basis-[calc(var(--ribbon-h)*var(--ar))] max-w-[calc(var(--ribbon-h)*var(--ar)*var(--ribbon-stretch))]"
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

        {hasMore ? (
          <div ref={sentinelRef} className="h-px" aria-hidden />
        ) : (
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            That is the end of the sweep: {formatCount(chromatic)} photographs with a hue and{" "}
            {achromatic} without.{" "}
            <Link href="/photography/colors" className="hover:text-accent">
              Browse by colour family
            </Link>{" "}
            instead.
          </p>
        )}

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
  const { imagesBySpectrum, entryFor } = await import("src/lib/photographyColors");
  const { COLOR_BUCKETS } = await import("src/lib/colorBuckets.mjs");

  const images = imagesBySpectrum();

  const swatch = new Map(COLOR_BUCKETS.map((bucket) => [bucket.id, bucket]));

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
  let achromatic = 0;

  images.forEach((image, index) => {
    const entry = entryFor(image.src);
    const primary = entry?.buckets[0];
    const band =
      primary && entry?.hue !== null && swatch.get(primary)?.neutral === false ? primary : null;
    if (!band) {
      achromatic += 1;
      return;
    }
    counts.set(band, (counts.get(band) ?? 0) + 1);
    if (!firstIndex.has(band)) firstIndex.set(band, index);
  });

  // COLOR_BUCKETS order is already the walk around the circle and is the order
  // the bands are laid out in, so filtering it to the families that actually
  // occur puts the marks in sweep order without a second sort. Each band is one
  // contiguous run now, which the hue-angle version could not guarantee — red
  // owns both ends of the circle, so it used to appear at both ends of the
  // strip under a single label.
  const marks: SpectrumMark[] = COLOR_BUCKETS.filter((bucket) => firstIndex.has(bucket.id))
    .map((bucket) => ({
      key: bucket.id,
      label: bucket.label,
      fill: bucket.swatch,
      index: firstIndex.get(bucket.id) ?? 0,
      count: counts.get(bucket.id) ?? 0,
    }))
    .sort((a, b) => a.index - b.index);

  if (achromatic > 0) {
    marks.push({
      key: "none",
      label: "No hue",
      // The tail is ordered by lightness rather than angle, and the ramp says
      // so. Built from the same two neutral swatches the family pages use, so
      // the two pages cannot disagree about what black and white look like.
      fill: `linear-gradient(to right, ${swatch.get("black")?.swatch}, ${swatch.get("white")?.swatch})`,
      index: images.length - achromatic,
      count: achromatic,
    });
  }

  return {
    props: { images, marks, chromatic: images.length - achromatic, achromatic },
  };
}

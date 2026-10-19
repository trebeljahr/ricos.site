import { CustomImageRenderer } from "@components/images/CustomImageRenderer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MasonryPhotoAlbum, RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import "react-photo-album/rows.css";
import type { ImageProps } from "src/@types";
import { addIdAndIndex } from "src/lib/utils/misc";
import { CustomLightBox, useCustomLightbox } from "./useCustomLightbox";

const groupSize = 10;

// Each group is its own row album, so a short leftover group gets stretched to
// the full album width: on /art (41 photos) the last painting was a lone
// 1000x1421 tile. A leftover under half a group joins the group before it.
function groupImages<T extends ImageProps>(images: T[]): T[][] {
  const groupedImages: T[][] = [];

  for (let i = 0; i < images.length; i += groupSize) {
    groupedImages.push(images.slice(i, i + groupSize));
  }

  const last = groupedImages.at(-1);
  if (groupedImages.length > 1 && last && last.length < groupSize / 2) {
    groupedImages.pop();
    groupedImages[groupedImages.length - 1].push(...last);
  }

  return groupedImages;
}

// react-photo-album divides this by each photo's share of the row (or by the
// column count), so it has to be the album's real width. Measured: the album
// sits in `max-w-5xl px-3`, i.e. min(100vw - 24px, 1000px). `calc(100vw - 24px)`
// alone over-declared by 1.4x at 1440px and pulled 1920 variants into ~490px
// slots.
const albumSizes = {
  size: "1000px",
  sizes: [{ viewport: "(max-width: 1024px)", size: "calc(100vw - 24px)" }],
};

const render = { image: CustomImageRenderer as any };

export type GalleryLayout = "rows" | "masonry";

type Props = {
  images: ImageProps[];
  /** "rows" (default) for photography. "masonry" staggers the tiles in
   *  columns: in rows, runs of same-shaped paintings repeat the same
   *  row of four. */
  layout?: GalleryLayout;
};

const InfiniteScrollGallery = ({ images, layout = "rows" }: Props) => {
  const photos = useMemo(() => images.map(addIdAndIndex), [images]);

  // id → global index lookup. Using id (stable per src) instead of arithmetic
  // on group-local react-photo-album indices — the old `index + i*groupSize`
  // could desync when displayedPhotos grew mid-render.
  const idToGlobalIndex = useMemo(() => {
    const m = new Map<string, number>();
    photos.forEach((p, i) => m.set(p.id, i));
    return m;
  }, [photos]);

  const props = useCustomLightbox({
    photos,
  });

  const { openModal, currentImageIndex } = props;

  // Grouped once over the whole gallery, so a group never changes size (and
  // re-lays out) when the next one loads.
  const groups = useMemo(() => groupImages(photos), [photos]);
  const [groupCount, setGroupCount] = useState(1);
  const displayedGroups = useMemo(() => groups.slice(0, groupCount), [groups, groupCount]);
  const displayedPhotos = useMemo(() => displayedGroups.flat(), [displayedGroups]);
  const displayedCount = displayedPhotos.length;

  // If the images prop changes (navigating to a different trip), reset the
  // displayed groups so the new gallery doesn't inherit the previous
  // gallery's scrolled-to-bottom state.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `photos` is the trigger, not an input
  useEffect(() => {
    setGroupCount(1);
  }, [photos]);

  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = groupCount < groups.length;

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setGroupCount((count) => Math.min(count + 1, groups.length));
    setTimeout(() => {
      loadingRef.current = false;
    }, 100);
  }, [groups.length]);

  useEffect(() => {
    if (currentImageIndex > displayedCount) {
      loadMore();
    }
  }, [currentImageIndex, displayedCount, loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { rootMargin: "500px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="not-prose">
      {layout === "masonry" ? (
        // One album for everything loaded: masonry drops each photo into the
        // shortest column, so appending a group never moves the ones above.
        <MasonryPhotoAlbum
          photos={displayedPhotos}
          columns={(containerWidth) => (containerWidth < 700 ? 2 : 3)}
          onClick={({ event, photo }) => openModal(idToGlobalIndex.get(photo.id) ?? 0, event)}
          render={render}
          defaultContainerWidth={1200}
          sizes={albumSizes}
        />
      ) : (
        <div>
          {displayedGroups.map((group, i) => (
            // Off the spacing scale on purpose: this has to match the row gutter
            // react-photo-album picks for the container width (5/10/15px), so the
            // gap between two groups looks like the gaps inside one.
            // biome-ignore lint/suspicious/noArrayIndexKey: stable list rendered once, no reorder
            <div key={i} className="mb-[5px] xs:mb-[10px] xl:mb-[15px]">
              <RowsPhotoAlbum
                photos={group}
                targetRowHeight={400}
                onClick={({ event, photo }) => openModal(idToGlobalIndex.get(photo.id) ?? 0, event)}
                render={render}
                defaultContainerWidth={1200}
                sizes={albumSizes}
              />
            </div>
          ))}
        </div>
      )}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

      <CustomLightBox {...props} photos={photos} />
    </div>
  );
};

export default InfiniteScrollGallery;

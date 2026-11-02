import { CustomImageRenderer, type PhotoWithId } from "@components/images/CustomImageRenderer";
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type RenderImageContext, type RenderImageProps, RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import SSR from "react-photo-album/ssr";
import type { ImageProps } from "src/@types";
import { addIdAndIndex } from "src/lib/utils/misc";
import { CustomLightBox, useCustomLightbox } from "./useCustomLightbox";

const groupSize = 10;

// The server cannot know the album's width, and a row layout built for the wrong
// one is the wrong height: on a phone, the old single 1200px layout grew by about
// 3000px on hydration and pushed the footer out of view. So the server renders
// one layout per width step, and CSS container queries show the matching one until
// the browser takes over at the exact width. The album sits in `max-w-5xl px-3`,
// i.e. min(100vw - 24px, 1000px), so 1000 is what every desktop width gets. 360 is
// where two portrait photos start sharing a row at this target height, so phones
// see no change on hydration. The library adds a layout for half the smallest step.
const ALBUM_BREAKPOINTS = [360, 640, 1000];

// SSR hands `breakpoints` to its child, and an album that gets them keeps snapping
// to the steps after hydration. Dropping them keeps its exact-width layout.
const ExactWidthAlbum = ({
  breakpoints: _breakpoints,
  ...props
}: ComponentProps<typeof RowsPhotoAlbum<PhotoWithId>>) => <RowsPhotoAlbum {...props} />;

// The first row is what a reader sees first. These stay lazy, because a hidden
// layout must not fetch its photos, but fetch ahead of everything else once shown.
const FIRST_ROW_PHOTOS = 3;

const renderGalleryImage = (props: RenderImageProps, context: RenderImageContext<PhotoWithId>) =>
  CustomImageRenderer(props, context, context.photo.index < FIRST_ROW_PHOTOS ? "high" : undefined);

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

const InfiniteScrollGallery = ({ images }: { images: ImageProps[] }) => {
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
  const displayedGroups = groups.slice(0, groupCount);
  const displayedCount = displayedGroups.reduce((sum, group) => sum + group.length, 0);

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
      <div>
        {displayedGroups.map((group, i) => (
          // Off the spacing scale on purpose: this has to match the row gutter
          // react-photo-album picks for the container width (5/10/15px), so the
          // gap between two groups looks like the gaps inside one.
          // biome-ignore lint/suspicious/noArrayIndexKey: stable list rendered once, no reorder
          <div key={i} className="mb-[5px] xs:mb-[10px] xl:mb-[15px]">
            <SSR breakpoints={ALBUM_BREAKPOINTS}>
              <ExactWidthAlbum
                photos={group}
                targetRowHeight={400}
                onClick={({ event, photo }) => openModal(idToGlobalIndex.get(photo.id) ?? 0, event)}
                render={{ image: renderGalleryImage as any }}
                // react-photo-album divides this by each photo's share of the
                // row, so it has to be the album's real width. Measured: the
                // album sits in `max-w-5xl px-3`, i.e. min(100vw - 24px, 1000px).
                // `calc(100vw - 24px)` alone over-declared by 1.4x at 1440px and
                // pulled 1920 variants into ~490px slots.
                sizes={{
                  size: "1000px",
                  sizes: [
                    {
                      viewport: "(max-width: 1024px)",
                      size: "calc(100vw - 24px)",
                    },
                  ],
                }}
              />
            </SSR>
          </div>
        ))}
      </div>
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

      <CustomLightBox {...props} photos={photos} />
    </div>
  );
};

export default InfiniteScrollGallery;

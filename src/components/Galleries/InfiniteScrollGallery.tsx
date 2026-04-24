import { CustomImageRenderer } from "@components/images/CustomImageRenderer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RowsPhotoAlbum } from "react-photo-album";
import "react-photo-album/rows.css";
import { ImageProps } from "src/@types";
import { addIdAndIndex } from "src/lib/utils/misc";
import { CustomLightBox, useCustomLightbox } from "./useCustomLightbox";

const groupSize = 10;

function groupImages<T extends ImageProps>(displayedImages: T[]): T[][] {
  const groupedImages: T[][] = [];

  for (let i = 0; i < displayedImages.length; i += groupSize) {
    groupedImages.push(displayedImages.slice(i, i + groupSize));
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

  const [displayedPhotos, setDisplayPhotos] = useState(
    photos.slice(0, groupSize)
  );

  // If the images prop changes (navigating to a different trip), reset the
  // displayedPhotos window so the new gallery doesn't inherit the previous
  // gallery's scrolled-to-bottom state.
  useEffect(() => {
    setDisplayPhotos(photos.slice(0, groupSize));
  }, [photos]);

  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = displayedPhotos.length < photos.length;

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setDisplayPhotos((prev) => {
      const newPhotos = photos.slice(prev.length, prev.length + groupSize);
      if (newPhotos.length === 0) return prev;
      return [...prev, ...newPhotos];
    });
    setTimeout(() => {
      loadingRef.current = false;
    }, 100);
  }, [photos]);

  useEffect(() => {
    if (currentImageIndex > displayedPhotos.length) {
      loadMore();
    }
  }, [currentImageIndex, displayedPhotos.length, loadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      },
      { rootMargin: "500px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <div className="not-prose">
      <div>
        {groupImages(displayedPhotos).map((group, i) => (
          <div key={i} className="mb-[5px] xs:mb-[10px] xl:mb-[15px]">
            <RowsPhotoAlbum
              photos={group}
              targetRowHeight={400}
              onClick={({ photo }: any) => {
                const globalIndex = idToGlobalIndex.get(photo.id) ?? 0;
                openModal({
                  ...photo,
                  index: globalIndex,
                });
              }}
              render={{ image: CustomImageRenderer as any }}
              defaultContainerWidth={1200}
              sizes={{
                size: "calc(100vw - 24px)",
                sizes: [
                  {
                    viewport: "(max-width: 520px)",
                    size: "calc(80vw - 105px)",
                  },
                  {
                    viewport: "(max-width: 1150px)",
                    size: "calc(80vw - 105px)",
                  },
                ],
              }}
            />
          </div>
        ))}
      </div>
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}

      <CustomLightBox {...props} photos={photos} />
    </div>
  );
};

export default InfiniteScrollGallery;

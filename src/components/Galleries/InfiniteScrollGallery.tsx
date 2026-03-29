import { CustomImageRenderer } from "@components/images/CustomImageRenderer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { RowsPhotoAlbum } from "react-photo-album";
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

  const props = useCustomLightbox({
    photos,
  });

  const { openModal, currentImageIndex } = props;

  const [displayedPhotos, setDisplayPhotos] = useState(
    photos.slice(0, groupSize)
  );

  const loadingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setDisplayPhotos((prev) => {
      const newPhotos = photos.slice(prev.length, prev.length + groupSize);
      if (newPhotos.length === 0) return prev;
      return [...prev, ...newPhotos];
    });
    // Allow next load after a short delay so InfiniteScroll
    // can measure the new content height before firing again
    setTimeout(() => {
      loadingRef.current = false;
    }, 100);
  }, [photos]);

  useEffect(() => {
    if (currentImageIndex > displayedPhotos.length) {
      loadMore();
    }
  }, [currentImageIndex, displayedPhotos.length, loadMore]);

  return (
    <div className="not-prose">
      <InfiniteScroll
        pageStart={0}
        loadMore={loadMore}
        hasMore={displayedPhotos.length < photos.length}
        loader={<div className="loader" key="0"></div>}
        initialLoad={false}
        threshold={500}
      >
        <div>
          {groupImages(displayedPhotos).map((group, i) => (
            <div key={i} className="mb-[5px] xs:mb-[10px] xl:mb-[15px]">
              <RowsPhotoAlbum
                photos={group}
                targetRowHeight={400}
                onClick={({ photo }: any) => {
                  openModal({
                    ...photo,
                    index: (photo as any).index + i * groupSize,
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
      </InfiniteScroll>

      <CustomLightBox {...props} photos={photos} />
    </div>
  );
};

export default InfiniteScrollGallery;

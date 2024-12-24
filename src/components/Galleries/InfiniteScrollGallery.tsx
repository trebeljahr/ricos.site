import { NextJsImage } from "@components/images/CustomRenderers";
import { useCallback, useEffect, useMemo, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { PhotoAlbum } from "react-photo-album";
import { ImageProps } from "src/@types";
import { addIdAndIndex } from "src/lib/utils";
import { useCustomLightbox } from "./useCustomLightbox";

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

  const { LightBox, openModal, currentImageIndex } = useCustomLightbox({
    photos,
  });

  const [displayedPhotos, setDisplayPhotos] = useState(
    photos.slice(0, groupSize)
  );

  const loadMore = useCallback(() => {
    const newPhotos = photos.slice(
      displayedPhotos.length,
      displayedPhotos.length + groupSize
    );
    setDisplayPhotos([...displayedPhotos, ...newPhotos]);
  }, [displayedPhotos, photos]);

  useEffect(() => {
    if (currentImageIndex > displayedPhotos.length) {
      loadMore();
    }
  }, [currentImageIndex, loadMore, displayedPhotos]);

  return (
    <div className="not-prose">
      <InfiniteScroll
        pageStart={0}
        loadMore={loadMore}
        hasMore={displayedPhotos.length < photos.length}
        loader={<div className="loader" key="0"></div>}
      >
        <div>
          {groupImages(displayedPhotos).map((group, i) => (
            <div key={i} className="mb-[5px] xs:mb-[10px] xl:mb-[15px]">
              <PhotoAlbum
                photos={group}
                targetRowHeight={400}
                layout="rows"
                onClick={(photo) => {
                  openModal({
                    ...photo,
                    index: photo.index + i * groupSize,
                  });
                }}
                renderPhoto={NextJsImage}
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

      <LightBox />
    </div>
  );
};

export default InfiniteScrollGallery;

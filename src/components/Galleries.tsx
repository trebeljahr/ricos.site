import { NextJsImage } from "@components/images/CustomRenderers";
import { useWindowSize } from "@react-hook/window-size";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { ClickHandler, Photo, PhotoAlbum } from "react-photo-album";
import { ImageProps } from "src/@types";
import { getImgWidthAndHeight } from "src/lib/mapToImageProps";
import { addIdAndIndex } from "src/lib/utils";
import Lightbox, {
  ContainerRect,
  isImageFitCover,
  isImageSlide,
  Slide,
  useLightboxProps,
  useLightboxState,
} from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

const groupSize = 10;

function groupImages<T extends ImageProps>(displayedImages: T[]): T[][] {
  const groupedImages: T[][] = [];

  for (let i = 0; i < displayedImages.length; i += groupSize) {
    groupedImages.push(displayedImages.slice(i, i + groupSize));
  }

  return groupedImages;
}

function isNextJsImage(slide: Slide) {
  return (
    isImageSlide(slide) &&
    typeof slide.width === "number" &&
    typeof slide.height === "number"
  );
}

export default function NextJsSlideImage({
  slide,
  offset,
  rect,
}: {
  slide: Slide;
  offset?: number;
  rect: ContainerRect;
}) {
  const {
    on: { click },
    carousel: { imageFit },
  } = useLightboxProps();

  const { currentIndex } = useLightboxState();

  const cover = isImageSlide(slide) && isImageFitCover(slide, imageFit);

  if (!isNextJsImage(slide) || !slide.height || !slide.width) return undefined;

  const width = !cover
    ? Math.round(
        Math.min(rect.width, (rect.height / slide.height) * slide.width)
      )
    : rect.width;

  const height = !cover
    ? Math.round(
        Math.min(rect.height, (rect.width / slide.width) * slide.height)
      )
    : rect.height;

  return (
    <div style={{ position: "relative", width, height }}>
      <Image
        fill
        alt={slide.src}
        src={slide.src}
        loading="eager"
        draggable={false}
        style={{
          objectFit: cover ? "cover" : "contain",
          cursor: click ? "pointer" : undefined,
        }}
        sizes={`${Math.ceil((width / window.innerWidth) * 100)}vw`}
        onClick={
          offset === 0 ? () => click?.({ index: currentIndex }) : undefined
        }
      />
    </div>
  );
}

export const SimpleGallery = ({ photos: images }: { photos: ImageProps[] }) => {
  const photos = useMemo(() => images.map(addIdAndIndex), [images]);

  const [_, height] = useWindowSize();

  const {
    isModalOpen,
    openModal,
    handleClose,
    currentImageIndex,
    setCurrentImageIndex,
    animateImageBackToGallery,
  } = useCustomLightbox({ photos });

  return (
    <>
      <PhotoAlbum
        photos={photos}
        targetRowHeight={400}
        layout="rows"
        renderPhoto={NextJsImage}
        defaultContainerWidth={1200}
        onClick={(photo) => {
          openModal({
            ...photo,
          });
        }}
      />

      <Lightbox
        open={isModalOpen}
        close={handleClose}
        slides={photos}
        index={currentImageIndex}
        on={{
          view: ({ index }) => {
            setCurrentImageIndex(index);
          },
          exiting: () => {
            animateImageBackToGallery();
          },
        }}
        carousel={{ finite: true }}
        plugins={[Thumbnails, Zoom]}
        render={{ slide: NextJsSlideImage, thumbnail: NextJsSlideImage }}
        thumbnails={{
          position: "bottom",
          width: height < 500 ? 50 : 100,
          height: height < 500 ? 50 : 100,
          border: 0,
          borderRadius: 4,
          padding: 0,
          gap: 10,
          imageFit: "cover",
          vignette: true,
        }}
      />
    </>
  );
};

export const ImageGallery = (props: { imageSources: string[] }) => {
  const { imageSources } = props;

  const [photos, setPhotos] = useState<ImageProps[] | null>(null);

  useEffect(() => {
    async function loadImages() {
      const loadedPhotos = await Promise.all(
        imageSources.map(async (src, index) => {
          const { width, height } = await getImgWidthAndHeight(src);

          return {
            src,
            width,
            height,
          };
        })
      );
      setPhotos(loadedPhotos);
    }

    loadImages();
  }, [imageSources]);

  if (!photos) return null;

  return <SimpleGallery photos={photos} />;
};

const useCustomLightbox = ({
  photos,
}: {
  photos: (ImageProps & { id: string })[];
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleClose = async () => {
    setIsModalOpen(false);
  };

  const animateImageBackToGallery = () => {
    const lightboxImgContainer = document.querySelector(".yarl__slide_current");
    const lightboxImg = lightboxImgContainer?.querySelector("img");
    const imageId = photos[currentImageIndex].id;
    const galleryImg = document.getElementById(imageId);

    if (!galleryImg || !lightboxImg) return;

    galleryImg.scrollIntoView({
      behavior: "instant",
      block: "center",
    });

    const lightboxRect = lightboxImg.getBoundingClientRect();
    const galleryRect = galleryImg.getBoundingClientRect();
    const placeholderImg = lightboxImg.cloneNode(true) as HTMLImageElement;
    placeholderImg.style.position = "fixed";
    placeholderImg.style.top = `${lightboxRect.top}px`;
    placeholderImg.style.left = `${lightboxRect.left}px`;
    placeholderImg.style.width = `${lightboxRect.width}px`;
    placeholderImg.style.height = `${lightboxRect.height}px`;
    placeholderImg.style.transition = "all 0.3s ease-in-out";
    placeholderImg.style.zIndex = "100";

    document.body.appendChild(placeholderImg);

    placeholderImg.getBoundingClientRect();
    galleryImg.getBoundingClientRect();

    placeholderImg.style.top = `${galleryRect.top}px`;
    placeholderImg.style.left = `${galleryRect.left}px`;
    placeholderImg.style.width = `${galleryRect.width}px`;
    placeholderImg.style.height = `${galleryRect.height}px`;

    placeholderImg.addEventListener("transitionend", () => {
      placeholderImg.remove();
    });
  };

  const openModal: ClickHandler<Photo> = ({ index }) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const currentImage = photos[currentImageIndex];
    const currentImageElement = document.getElementById(currentImage.id);

    if (currentImageElement) {
      currentImageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentImageIndex, photos]);

  return {
    openModal,
    isModalOpen,
    handleClose,
    currentImageIndex,
    setCurrentImageIndex,
    animateImageBackToGallery,
  };
};

export const InfiniteScrollGallery = ({ images }: { images: ImageProps[] }) => {
  const photos = useMemo(() => images.map(addIdAndIndex), [images]);

  const {
    openModal,
    isModalOpen,
    handleClose,
    currentImageIndex,
    setCurrentImageIndex,
    animateImageBackToGallery,
  } = useCustomLightbox({ photos });

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

      <Lightbox
        open={isModalOpen}
        close={handleClose}
        slides={photos}
        index={currentImageIndex}
        on={{
          view: ({ index }) => {
            setCurrentImageIndex(index);
          },
          exiting: () => {
            animateImageBackToGallery();
          },
        }}
        // noScroll={{ disabled: false }}
        render={{ slide: NextJsSlideImage, thumbnail: NextJsSlideImage }}
        carousel={{ finite: true }}
        plugins={[Thumbnails, Zoom]}
        thumbnails={{
          position: "bottom",
          border: 0,
          borderRadius: 4,
          padding: 0,
          gap: 10,
          imageFit: "cover",
          vignette: true,
        }}
      />
    </div>
  );
};

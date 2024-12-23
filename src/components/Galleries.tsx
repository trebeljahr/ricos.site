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

function groupImages(displayedImages: ImageProps[]): ImageProps[][] {
  const groupedImages: ImageProps[][] = [];

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
        alt=""
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
          console.log(photo);

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
    const galleryImg = document.getElementById(photos[currentImageIndex].id);
    const navbar = document.querySelector<HTMLElement>("#navbar");

    if (!galleryImg || !lightboxImg || !navbar) return;

    const lightboxRect = lightboxImg.getBoundingClientRect();
    const galleryRect = galleryImg.getBoundingClientRect();
    const placeholderImg = lightboxImg.cloneNode(true) as HTMLImageElement;
    placeholderImg.style.position = "fixed";
    placeholderImg.style.top = `${lightboxRect.top}px`;
    placeholderImg.style.left = `${lightboxRect.left}px`;
    placeholderImg.style.width = `${lightboxRect.width}px`;
    placeholderImg.style.height = `${lightboxRect.height}px`;
    placeholderImg.style.transition = "all 0.2s ease-in-out";
    placeholderImg.style.zIndex = "2";

    document.body.appendChild(placeholderImg);

    // Force reflow to ensure the browser registers the right positions
    placeholderImg.getBoundingClientRect();
    galleryImg.getBoundingClientRect();
    navbar.getBoundingClientRect();

    const navbarStyle = window.getComputedStyle(navbar);
    const navbarHeight = parseFloat(navbarStyle.height);
    const paddingTop = parseFloat(navbarStyle.paddingTop);
    const paddingBottom = parseFloat(navbarStyle.paddingBottom);

    const realNavHeight = navbarHeight - paddingTop - paddingBottom;

    placeholderImg.style.top = `${galleryRect.top - realNavHeight}px`;
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

    if (currentImageElement && isModalOpen) {
      currentImageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentImageIndex, photos, isModalOpen]);

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
  const {
    openModal,
    isModalOpen,
    handleClose,
    currentImageIndex,
    setCurrentImageIndex,
    animateImageBackToGallery,
  } = useCustomLightbox({ photos: images.map(addIdAndIndex) });

  const [displayedImages, setDisplayImages] = useState(
    images.slice(0, groupSize)
  );

  const loadMoreImages = useCallback(() => {
    const newImages = images.slice(
      displayedImages.length,
      displayedImages.length + groupSize
    );
    setDisplayImages([...displayedImages, ...newImages]);
  }, [displayedImages, images]);

  useEffect(() => {
    if (currentImageIndex > displayedImages.length) {
      loadMoreImages();
    }
  }, [currentImageIndex, loadMoreImages, displayedImages]);

  const [_, height] = useWindowSize();

  return (
    <div className="not-prose">
      <InfiniteScroll
        pageStart={0}
        loadMore={loadMoreImages}
        hasMore={displayedImages.length < images.length}
        loader={<div className="loader" key="0"></div>}
      >
        <div>
          {groupImages(displayedImages).map((group, i) => (
            <div key={i} className="mb-[5px] xs:mb-[10px] lg:mb-[15px]">
              <PhotoAlbum
                photos={group.map(addIdAndIndex)}
                targetRowHeight={height * 0.6}
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
        slides={images}
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
    </div>
  );
};

import { NextJsImage } from "@components/images/CustomRenderers";
import { useCallback, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { ClickHandler, Photo, PhotoAlbum } from "react-photo-album";
import { ImageProps } from "src/@types";
import { useWindowSize } from "src/hooks/useWindowSize";
import { getImgWidthAndHeight } from "src/lib/mapToImageProps";
import Lightbox from "yet-another-react-lightbox";
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

export const SimpleGallery = ({ photos }: { photos: ImageProps[] }) => {
  const { width, height } = useWindowSize();

  if (!width || !height) return null;

  return (
    <PhotoAlbum
      photos={photos}
      targetRowHeight={height * 0.2}
      layout="rows"
      renderPhoto={NextJsImage}
      defaultContainerWidth={1200}
      //   sizes={{
      //     size: "calc(100vw - 24px)",
      //     sizes: [
      //       {
      //         viewport: "(max-width: 520px)",
      //         size: "calc(80vw - 105px)",
      //       },
      //       {
      //         viewport: "(max-width: 1150px)",
      //         size: "calc(80vw - 105px)",
      //       },
      //     ],
      //   }}
    />
  );
};

export const ImageGallery = (props: { imageSources: string[] }) => {
  console.log("Hi from Simple Gallery Component", props);

  const { imageSources } = props;

  const [photos, setPhotos] = useState<ImageProps[] | null>(null);

  useEffect(() => {
    async function loadImages() {
      const loadedPhotos = await Promise.all(
        imageSources.map(async (src, index) => {
          const { width, height } = await getImgWidthAndHeight(src);

          return {
            key: `${src}-${index}`,
            alt: "",
            index,
            name: src,
            srcSet: [],
            title: "",
            src: src,
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

export const NiceGallery = ({ images }: { images: ImageProps[] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [displayedImages, setDisplayImages] = useState(
    images.slice(0, groupSize)
  );

  const handleClose = async () => {
    setIsModalOpen(false);
  };

  const animateImageBackToGallery = () => {
    const lightboxImgContainer = document.querySelector(".yarl__slide_current");
    const lightboxImg = lightboxImgContainer?.querySelector("img");
    const galleryImg = document.getElementById(images[currentImageIndex].name);
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

  useEffect(() => {
    const currentImage = images[currentImageIndex];

    const currentImageElement = document.getElementById(currentImage.name);

    if (currentImageElement) {
      currentImageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentImageIndex, images]);

  const { width, height } = useWindowSize();

  if (!width || !height) return null;

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
                photos={group}
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

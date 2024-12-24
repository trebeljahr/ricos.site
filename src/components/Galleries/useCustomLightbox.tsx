import NextJsSlideImage from "@components/Galleries";
import { useEffect, useState } from "react";
import { ClickHandler, Photo } from "react-photo-album";
import { ImageProps } from "src/@types";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

export const useCustomLightbox = ({
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

  const LightBox = () => (
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
        border: 0,
        borderRadius: 4,
        padding: 0,
        gap: 10,
        imageFit: "cover",
        vignette: true,
      }}
    />
  );

  return {
    LightBox,
    openModal,
    isModalOpen,
    handleClose,
    currentImageIndex,
    setCurrentImageIndex,
    animateImageBackToGallery,
  };
};

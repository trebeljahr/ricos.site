import { type MouseEvent, useEffect, useRef, useState } from "react";
import type { ImageProps } from "src/@types";
import Lightbox, {
  CloseIcon,
  type ControllerRef,
  IconButton,
  type ZoomRef,
} from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";
import { openWithLightboxTransition } from "src/lib/lightboxTransition";
import NextJsSlideImage from "./SlideImage";

type Props = {
  isModalOpen: boolean;
  handleClose: () => void;
  photos: ImageProps[];
  currentImageIndex: number;
  setCurrentImageIndex: (index: number) => void;
  animateImageBackToGallery: () => void;
};

// Same length as the thumbnail morphs in both directions.
const ANIMATION_MS = 300;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

// The zoom plugin starts its Web Animation in a layout effect, so it only
// exists a tick after `changeZoom`. Wait for it to settle before the caller
// closes the lightbox — otherwise the zoom-out and the morph back into the
// gallery grid run on top of each other and the image jumps. Timers rather
// than rAF, so a backgrounded tab still closes.
const waitForZoomOut = () =>
  new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    window.setTimeout(() => {
      const wrapper = document.querySelector(".yarl__slide_current .yarl__slide_wrapper");
      const animations = wrapper?.getAnimations?.() ?? [];

      if (animations.length === 0) {
        done();
        return;
      }

      Promise.all(animations.map((animation) => animation.finished)).then(done, done);
    }, 32);

    // Fallback in case an animation is cancelled and never settles.
    window.setTimeout(done, ANIMATION_MS + 100);
  });

export const CustomLightBox = ({
  isModalOpen,
  handleClose,
  photos,
  currentImageIndex,
  setCurrentImageIndex,
  animateImageBackToGallery,
}: Props) => {
  const zoomRef = useRef<ZoomRef | null>(null);
  const controllerRef = useRef<ControllerRef | null>(null);
  const isZoomingOutRef = useRef(false);

  // The lightbox fires `exiting` (and with it the morph back to the grid) the
  // moment it starts closing, so a zoomed-in image has to be zoomed back out
  // *before* the close reaches the lightbox. Returns true when the close was
  // deferred and the caller should swallow the event.
  const deferCloseUntilZoomedOut = () => {
    if (isZoomingOutRef.current) return true;

    const zoom = zoomRef.current;
    if (!zoom || zoom.disabled || zoom.zoom <= zoom.minZoom || prefersReducedMotion()) return false;

    isZoomingOutRef.current = true;
    zoom.changeZoom(zoom.minZoom);
    waitForZoomOut().then(() => {
      isZoomingOutRef.current = false;
      controllerRef.current?.close();
    });
    return true;
  };

  // The Close button is replaced below, but Escape goes straight to the
  // lightbox's own keyboard handler — intercept it before React sees it.
  useEffect(() => {
    if (!isModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !deferCloseUntilZoomedOut()) return;
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  });

  return (
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
      animation={{ fade: ANIMATION_MS, zoom: ANIMATION_MS }}
      controller={{ ref: controllerRef }}
      zoom={{ ref: zoomRef }}
      plugins={[Thumbnails, Zoom]}
      render={{
        slide: NextJsSlideImage,
        thumbnail: NextJsSlideImage,
        buttonClose: () => (
          <IconButton
            key="close"
            label="Close"
            icon={CloseIcon}
            onClick={() => {
              if (!deferCloseUntilZoomedOut()) controllerRef.current?.close();
            }}
          />
        ),
      }}
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
};

export const useCustomLightbox = ({ photos }: { photos: (ImageProps & { id: string })[] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(Number.POSITIVE_INFINITY);

  // When the photos array identity changes (e.g. navigating to a different
  // gallery page), reset the lightbox. Otherwise the previous page's open
  // state + index leak into the new gallery.
  const firstIdRef = useRef<string | null>(photos[0]?.id ?? null);
  useEffect(() => {
    const first = photos[0]?.id ?? null;
    if (firstIdRef.current !== first) {
      firstIdRef.current = first;
      setIsModalOpen(false);
      setCurrentImageIndex(Number.POSITIVE_INFINITY);
    }
  }, [photos]);

  const handleClose = async () => {
    setIsModalOpen(false);
  };

  const animateImageBackToGallery = () => {
    const lightboxImgContainer = document.querySelector(".yarl__slide_current");
    const lightboxImg = lightboxImgContainer?.querySelector("img");
    const imageId = photos[currentImageIndex]?.id;
    if (!imageId) return;

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

  const openModal = (index: number, event?: MouseEvent) => {
    const thumb =
      event?.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : document.getElementById(photos[index]?.id ?? "");
    openWithLightboxTransition(
      () => {
        setCurrentImageIndex(index);
        setIsModalOpen(true);
      },
      thumb,
      event,
    );
  };

  useEffect(() => {
    const currentImage = photos[currentImageIndex];
    if (!currentImage) return;

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

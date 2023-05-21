import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { getS3Folders, getS3ImageData } from "src/lib/aws";
import { ImageProps } from "src/utils/types";
import { useLastViewedPhoto } from "src/utils/useLastViewedPhoto";
import Layout from "../../components/layout";
import { range } from "src/utils/range";
import {
  ClickHandler,
  Photo,
  PhotoAlbum,
  RenderPhotoProps,
} from "react-photo-album";
import Lightbox, {
  ContainerRect,
  Render,
  RenderSlideProps,
  Slide,
  isImageFitCover,
  isImageSlide,
  useLightboxProps,
} from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import "yet-another-react-lightbox/styles.css";
import {
  NextJsImage,
  NextThumbnailRenderer,
  SlideImageWithNext,
} from "src/components/image-gallery/customRenderers";
// import useLightbox from "src/hooks/useLightbox";

export default function ImageGallery({
  images,
  tripName,
}: {
  images: ImageProps[];
  tripName: string;
}) {
  const router = useRouter();
  const { photoId: photoIdFromQuery } = router.query;

  const photoIdNumber = parseInt(photoIdFromQuery as string);
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();

  const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (lastViewedPhoto && !photoIdNumber) {
      lastViewedPhotoRef?.current?.scrollIntoView({ block: "center" });
      setLastViewedPhoto(0);
    }
  }, [photoIdNumber, lastViewedPhoto, setLastViewedPhoto]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const gotoPrevious = () =>
    currentImageIndex > 0 && setCurrentImageIndex(currentImageIndex - 1);

  const gotoNext = () =>
    currentImageIndex + 1 < images.length &&
    setCurrentImageIndex(currentImageIndex + 1);

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const photos = images.map((image) => ({
    src: image.src,
    alt: image.name,
    width: image.width,
    height: image.height,
  }));

  const openModal: ClickHandler<Photo> = ({ index }) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  let filteredImages = images?.filter((img: ImageProps) =>
    range(currentImageIndex - 15, currentImageIndex + 15).includes(img.index)
  );

  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url={`/photography/${tripName}`}
      fullScreen={false}
    >
      <PhotoAlbum
        photos={photos}
        layout="rows"
        onClick={openModal}
        renderPhoto={NextJsImage}
        defaultContainerWidth={1200}
        sizes={{
          size: "calc(100vw - 40px)",
        }}
      />
      <Lightbox
        open={isModalOpen}
        close={handleClose}
        slides={photos}
        index={currentImageIndex}
        // render={{ slide: SlideImageWithNext, thumbnail: NextThumbnailRenderer }}
        plugins={[Zoom]}
        // thumbnails={{
        //   position: "bottom",
        //   width: 120,
        //   height: 80,
        //   // border,
        //   // borderRadius,
        //   // padding,
        //   // gap,
        //   // showToggle,
        // }}
      />
    </Layout>
  );
}

type StaticProps = {
  params: { tripName: string };
};

export async function getStaticPaths() {
  const tripNames = await getS3Folders();

  return {
    paths: tripNames.map((tripName) => {
      return { params: { tripName } };
    }),
    fallback: false,
  };
}

const imageSizes = [16, 32, 48, 64, 96, 128, 256, 384];
const deviceSizes = [640, 750, 828, 1080, 1200, 1920, 2048, 3840];

function nextImageUrl(src: string, size: number) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${size}&q=75`;
}

export async function getStaticProps({ params }: StaticProps) {
  const { tripName } = params;

  const imageFileNames = await getS3ImageData({
    prefix: tripName,
  });

  const slides: ImageProps[] = imageFileNames.map(
    ({ name, width, height }, index) => {
      const src = `https://${process.env.NEXT_PUBLIC_STATIC_FILE_URL}/photography/${name}`;

      return {
        width,
        height,
        index,
        tripName,
        name,
        src: nextImageUrl(src, 640),
        srcSet: imageSizes
          .concat(...deviceSizes)
          .filter((size) => size <= width)
          .map((size) => ({
            src: nextImageUrl(src, size),
            width: size,
            height: Math.round((height / width) * size),
          })),
      };
    }
  );

  console.log({ slides: slides.slice(0, 10) });

  return { props: { images: slides.slice(0, 10), tripName: params.tripName } };
}

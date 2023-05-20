import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import Lightbox from "react-spring-lightbox";
import { getS3Folders, getS3ImageData } from "src/lib/aws";
import { ImageProps } from "src/utils/types";
import { useLastViewedPhoto } from "src/utils/useLastViewedPhoto";
import Layout from "../../../components/layout";
import { range } from "src/utils/range";
import {
  ClickHandler,
  Photo,
  PhotoAlbum,
  RenderPhotoProps,
} from "react-photo-album";

export function NextJsImage({
  photo,
  imageProps: { alt, title, className, onClick },
  wrapperStyle,
}: RenderPhotoProps) {
  console.log(photo);

  return (
    <div style={{ ...wrapperStyle, position: "relative" }}>
      <Image
        src={photo}
        width={photo.width}
        height={photo.height}
        placeholder={"blurDataURL" in photo ? "blur" : undefined}
        {...{ alt, title, className, onClick }}
      />
    </div>
  );
}

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
    console.log("closing!");
    setIsModalOpen(false);
  };

  const photos = images.map((image) => ({
    src: image.url,
    alt: image.name,
    width: image.width,
    height: image.height,
  }));

  const openModal: ClickHandler<Photo> = ({ index }) => {
    console.log("opening modal!");
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
          sizes: [
            { viewport: "(max-width: 299px)", size: "calc(100vw - 10px)" },
            { viewport: "(max-width: 599px)", size: "calc(100vw - 20px)" },
            { viewport: "(max-width: 1199px)", size: "calc(100vw - 30px)" },
          ],
        }}
      />

      <Lightbox
        isOpen={isModalOpen}
        onPrev={gotoPrevious}
        onNext={gotoNext}
        images={photos}
        currentIndex={currentImageIndex}
        style={{ background: "rgba(20, 20, 20, 0.99)" }}
        /* Add your own UI */
        // renderHeader={() => (<CustomHeader />)}
        renderFooter={() => (
          <div className="fixed inset-x-0 bottom-0 z-40 overflow-hidden bg-gradient-to-b from-black/0 to-black/60">
            <motion.div
              initial={false}
              className="mx-auto mt-6 flex aspect-[3/2] h-10"
            >
              <AnimatePresence initial={false}>
                {filteredImages.map(({ index }) => (
                  <motion.button
                    initial={{
                      width: "0%",
                      x: `${Math.max(
                        (currentImageIndex - 1) * -100,
                        15 * -100
                      )}%`,
                    }}
                    animate={{
                      scale: index === currentImageIndex ? 1.25 : 1,
                      width: "100%",
                      x: `${Math.max(currentImageIndex * -100, 15 * -100)}%`,
                    }}
                    transition={{
                      duration: 0.5,
                    }}
                    exit={{ width: "0%" }}
                    onClick={() => setCurrentImageIndex(index)}
                    key={index}
                    className={`${
                      index === currentImageIndex
                        ? "z-20 rounded-md shadow shadow-black/50"
                        : "z-10"
                    } ${currentImageIndex === 0 ? "rounded-l-md" : ""} ${
                      currentImageIndex === images.length - 1
                        ? "rounded-r-md"
                        : ""
                    } relative inline-block w-full shrink-0 transform-gpu overflow-hidden focus:outline-none`}
                  >
                    <Image
                      alt="small photos on the bottom"
                      width={180}
                      height={120}
                      className={`${
                        index === currentImageIndex
                          ? "brightness-110 hover:brightness-110"
                          : "brightness-50 contrast-125 hover:brightness-75"
                      } h-full transform object-cover transition`}
                      src={images[index].url}
                    />
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
        renderPrevButton={() =>
          currentImageIndex > 0 && (
            <button
              className="z-10 absolute left-3 top-[calc(50%-16px)] rounded-full bg-black/50 p-3 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white focus:outline-none"
              style={{ transform: "translate3d(0, 0, 0)" }}
              onClick={gotoPrevious}
            >
              <ChevronLeftIcon className="h-6 w-6" />
            </button>
          )
        }
        renderNextButton={() =>
          currentImageIndex < images.length - 1 && (
            <button
              className="z-10 absolute right-3 top-[calc(50%-16px)] rounded-full bg-black/50 p-3 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white focus:outline-none"
              style={{ transform: "translate3d(0, 0, 0)" }}
              onClick={gotoNext}
            >
              <ChevronRightIcon className="h-6 w-6" />
            </button>
          )
        }
        // renderImageOverlay={}
        /* Add styling */
        // className="cool-class"
        // style={{ background: "grey" }}

        /* Handle closing */
        onClose={handleClose}

        /* Use single or double click to zoom */
        // singleClickToZoom

        /* react-spring config for open/close animation */
        // pageTransitionConfig={{
        //   from: { transform: "scale(0.75)", opacity: 0 },
        //   enter: { transform: "scale(1)", opacity: 1 },
        //   leave: { transform: "scale(0.75)", opacity: 0 },
        //   config: { mass: 1, tension: 320, friction: 32 }
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

export async function getStaticProps({ params }: StaticProps) {
  console.log("from tripName", { params });

  const imageFileNames = await getS3ImageData({
    prefix: params.tripName,
  });

  console.log(imageFileNames[0]);

  const images: ImageProps[] = imageFileNames.map(
    ({ name, width, height }, index) => {
      return {
        tripName: params.tripName,
        index,
        width,
        height,
        name,
        url: `https://${process.env.NEXT_PUBLIC_STATIC_FILE_URL}/photography/${name}`,
      };
    }
  );

  console.log({ images });

  return { props: { images, tripName: params.tripName } };
}

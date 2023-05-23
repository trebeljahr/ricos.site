import { useState } from "react";
import { ClickHandler, Photo, PhotoAlbum } from "react-photo-album";
import { getS3Folders, getS3ImageData } from "src/lib/aws";
import { ImageProps } from "src/utils/types";
import { NextJsImage } from "src/components/image-gallery/customRenderers";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Layout from "../../components/layout";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

export default function ImageGallery({
  images,
  tripName,
}: {
  images: ImageProps[];
  tripName: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const openModal: ClickHandler<Photo> = ({ index }) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url={`/photography/${tripName}`}
      fullScreen={true}
    >
      <PhotoAlbum
        photos={images}
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
        slides={images}
        index={currentImageIndex}
        plugins={[Thumbnails, Zoom]}
        thumbnails={{
          position: "bottom",
          width: 100,
          height: 100,
          border: 0,
          borderRadius: 4,
          padding: 0,
          gap: 10,
          imageFit: "cover",
          vignette: true,
        }}
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

      const image = {
        width,
        height,
        index,
        tripName,
        name,
        src: nextImageUrl(src, 640),
        srcSet: imageSizes
          .concat(...deviceSizes)
          .filter((size) => size <= width)
          .map((size) => {
            const aspectRatio = Math.round(height / width);
            return {
              src: nextImageUrl(src, size),
              width: size,
              height: aspectRatio * size,
            };
          }),
      };

      return image;
    }
  );

  console.log({ slides: slides.slice(0, 10) });

  return { props: { images: slides.slice(0, 10), tripName: params.tripName } };
}

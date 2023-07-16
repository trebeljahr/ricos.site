import { useState } from "react";
import { ClickHandler, Photo, PhotoAlbum } from "react-photo-album";
import { NextJsImage } from "src/components/image-gallery/customRenderers";
import { useWindowSize } from "src/hooks/useWindowSize";
import { bucketPrefix, getS3Folders, getS3ImageData } from "src/lib/aws";
import { mapToImageProps } from "src/lib/mapToImageProps";
import { ImageProps } from "src/utils/types";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import Layout from "../../components/layout";

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

  const { width, height } = useWindowSize();

  if (!width || !height) return null;

  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url={`/${bucketPrefix}${tripName}`}
      fullScreen={true}
    >
      <PhotoAlbum
        photos={images}
        targetRowHeight={height * 0.6}
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

export async function getStaticProps({ params }: StaticProps) {
  const { tripName } = params;

  const awsImageData = await getS3ImageData({
    prefix: tripName,
  });

  const images: ImageProps[] = await mapToImageProps(awsImageData, tripName);

  return { props: { images, tripName: params.tripName } };
}

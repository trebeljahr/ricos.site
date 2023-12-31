import { useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { ClickHandler, Photo, PhotoAlbum } from "react-photo-album";
import { ToTopButton } from "src/components/ToTopButton";
import { NextJsImage } from "src/components/image-gallery/customRenderers";
import { useWindowSize } from "src/hooks/useWindowSize";
import { getDataFromS3, getS3Folders, photographyFolder } from "src/lib/aws";
import { mapToImageProps } from "src/lib/mapToImageProps";
import { ImageProps } from "src/utils/types";
import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import {
  BreadCrumbs,
  turnKebabIntoTitleCase,
} from "../../components/BreadCrumbs";
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
  const [displayedImages, setDisplayImages] = useState(images.slice(0, 10));

  const handleClose = () => {
    setIsModalOpen(false);
    // console.log("current image:", images[currentImageIndex]);
  };

  const openModal: ClickHandler<Photo> = ({ index }) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const { width, height } = useWindowSize();

  if (!width || !height) return null;

  const loadMoreImages = (count = 10) => {
    const newImages = images.slice(
      displayedImages.length,
      displayedImages.length + count
    );
    setDisplayImages([...displayedImages, ...newImages]);
  };

  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url={`/photography/${tripName}`}
      fullScreen={true}
    >
      <div className="mb-20">
        <BreadCrumbs path={`photography/${tripName}`} />
        <h1 style={{ marginTop: "-2rem", marginBottom: "1.2rem" }}>
          {turnKebabIntoTitleCase(tripName)}
        </h1>
        <InfiniteScroll
          pageStart={0}
          loadMore={loadMoreImages}
          hasMore={displayedImages.length < images.length}
          loader={<div className="loader" key="0"></div>}
        >
          <PhotoAlbum
            photos={displayedImages}
            targetRowHeight={height * 0.6}
            layout="rows"
            onClick={openModal}
            renderPhoto={NextJsImage}
            defaultContainerWidth={1200}
            sizes={{
              size: "calc(100vw - 24px)",
              sizes: [
                { viewport: "(max-width: 520px)", size: "calc(80vw - 105px)" },
                { viewport: "(max-width: 1150px)", size: "calc(80vw - 105px)" },
              ],
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
        </InfiniteScroll>

        <ToTopButton />
      </div>
    </Layout>
  );
}

type StaticProps = {
  params: { tripName: string };
};

export async function getStaticPaths() {
  const tripNames = await getS3Folders(photographyFolder);

  return {
    paths: tripNames.map((tripName) => {
      return { params: { tripName } };
    }),
    fallback: false,
  };
}

export async function getStaticProps({ params }: StaticProps) {
  const { tripName } = params;
  const prefix = photographyFolder + tripName;
  const awsImageData = await getDataFromS3({
    prefix,
    numberOfItems: 1000,
  });
  const images: ImageProps[] = mapToImageProps(awsImageData, prefix);

  return { props: { images, tripName: params.tripName } };
}

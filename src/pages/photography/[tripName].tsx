import Link from "next/link";
import { useState } from "react";
import { ClickHandler, Photo, PhotoAlbum } from "react-photo-album";
import { ToTopButton } from "src/components/ToTopButton";
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
import { tripNameMap } from "../photography";
import InfiniteScroll from "react-infinite-scroller";

export function BreadCrumbs() {
  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        <li className="inline-flex items-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue "
          >
            <svg
              className="w-3 h-3 mr-2.5"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
            </svg>
            Home
          </Link>
        </li>
        <li>
          <div className="flex items-center">
            <svg
              className="w-3 h-3 text-gray-400 mx-1"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 6 10"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m1 9 4-4-4-4"
              />
            </svg>
            <Link
              href="/photography"
              className="ml-1 text-sm font-medium text-gray-700 hover:text-blue md:ml-2"
            >
              Photography
            </Link>
          </div>
        </li>
      </ol>
    </nav>
  );
}

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
      url={`/${bucketPrefix}${tripName}`}
      fullScreen={true}
    >
      <div className="mb-20">
        <BreadCrumbs />
        <h1 style={{ marginTop: "-2rem", marginBottom: "1.2rem" }}>
          {tripNameMap[tripName]}
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
            slides={displayedImages}
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

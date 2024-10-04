import { BreadCrumbs, turnKebabIntoTitleCase } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { ToTopButton } from "@components/ToTopButton";
import { NextJsImage } from "@components/images/CustomRenderers";
import { useCallback, useEffect, useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { ClickHandler, Photo, PhotoAlbum } from "react-photo-album";
import { ImageProps } from "src/@types";
import { useWindowSize } from "src/hooks/useWindowSize";
import { getDataFromS3, getS3Folders, photographyFolder } from "src/lib/aws";
import { mapToImageProps } from "src/lib/mapToImageProps";
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

export default function ImageGallery({
  images,
  tripName,
}: {
  images: ImageProps[];
  tripName: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [displayedImages, setDisplayImages] = useState(
    images.slice(0, groupSize)
  );

  const handleClose = () => {
    const currentImage = displayedImages[currentImageIndex];

    setIsModalOpen(false);
    const currentImageElement = document.getElementById(currentImage.name);

    if (currentImageElement) {
      currentImageElement.scrollIntoView({ behavior: "smooth" });
    }
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

  const { width, height } = useWindowSize();

  if (!width || !height) return null;

  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url={`/photography/${tripName}`}
      fullScreen={true}
    >
      <section className="mb-20">
        <BreadCrumbs path={`photography/${tripName}`} />
        <h1>{turnKebabIntoTitleCase(tripName)}</h1>
        <div className="not-prose">
          <InfiniteScroll
            pageStart={0}
            loadMore={loadMoreImages}
            hasMore={displayedImages.length < images.length}
            loader={<div className="loader" key="0"></div>}
          >
            <div>
              {groupImages(displayedImages).map((group, i) => (
                <div key={i} className="mb-[15px]">
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
            }}
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

        <ToTopButton />
      </section>
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

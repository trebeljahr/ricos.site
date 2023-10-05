import { useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { ClickHandler, Photo, PhotoAlbum } from "react-photo-album";
import { ToTopButton } from "src/components/ToTopButton";
import { NextJsImage } from "src/components/image-gallery/customRenderers";
import Layout from "src/components/layout";
import { useWindowSize } from "src/hooks/useWindowSize";
import { getDataFromS3 } from "src/lib/aws";
import { mapToImageProps } from "src/lib/mapToImageProps";
import { ImageProps } from "src/utils/types";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

export default function MidjourneyGallery({
  images,
}: {
  images: ImageProps[];
}) {
  const [displayedImages, setDisplayImages] = useState(images.slice(0, 10));

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
      url={`/midjourney`}
      fullScreen={true}
    >
      <div className="mb-20">
        <h1 style={{ marginTop: "-2rem", marginBottom: "1.2rem" }}>
          Midjourney Images
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
        </InfiniteScroll>

        <ToTopButton />
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const prefix = "webp/";
  const awsImageData = await getDataFromS3({ prefix, numberOfItems: 1000 });
  const images: ImageProps[] = mapToImageProps(awsImageData, prefix);
  return { props: { images } };
}

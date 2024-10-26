import { useState } from "react";
import InfiniteScroll from "react-infinite-scroller";
import { PhotoAlbum } from "react-photo-album";
import { ToTopButton } from "@components/ToTopButton";
import { NextJsImage } from "@components/images/CustomRenderers";
import Layout from "@components/Layout";
import { useWindowSize } from "src/hooks/useWindowSize";
import { getDataFromS3 } from "src/lib/aws";
import { mapToImageProps } from "src/lib/mapToImageProps";
import { ImageProps } from "src/@types";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";
import { NiceGallery } from "./photography/[tripName]";

export default function MidjourneyGallery({
  images,
}: {
  images: ImageProps[];
}) {
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
        <NiceGallery images={images} />

        <ToTopButton />
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const prefix = "midjourney/";
  const awsImageData = await getDataFromS3({ prefix });
  const images: ImageProps[] = mapToImageProps(awsImageData, prefix);

  return { props: { images } };
}

import { GalleryPage } from "@components/GalleryPage";
import Layout from "@components/Layout";
import type { ImageProps } from "src/@types";
import {
  getDataFromMetadata,
  getPhotographyTripNames,
  photographyFolder,
} from "src/lib/imageMetadata";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";
import { trips } from "../photography";

export default function SinglePhotographyShowcasePage({
  images,
  tripName,
}: {
  images: ImageProps[];
  tripName: string;
}) {
  const tripMeta = trips.find(({ name }) => name === tripName) || {
    src: "/assets/blog/photography.png",
    alt: "a high quality rendering of an old film camera",
  };

  const readableName = turnKebabIntoTitleCase(tripName);
  const photoCount = images.length;

  // Several trips have no hand-picked hero shot (src: "" in `trips`). Use the
  // first photo of the gallery for those, so every gallery gets an og:image.
  const firstImage = images[0];
  const heroSrc = tripMeta.src || firstImage?.src || "";
  const heroAlt = tripMeta.alt || `A photo from ${readableName}`;
  const heroDimensions = tripMeta.src ? undefined : firstImage;

  return (
    <Layout
      title={`${readableName} Photography – Rico Trebeljahr`}
      description={`Browse ${photoCount} photos from ${readableName}. Travel photography by Rico Trebeljahr capturing landscapes, people, and moments from around the world.`}
      url={`/photography/${tripName}`}
      image={heroSrc}
      imageAlt={heroAlt}
      imageWidth={heroDimensions?.width}
      imageHeight={heroDimensions?.height}
      keywords={[
        "photography",
        "gallery",
        "images",
        "photos",
        "art",
        "pictures",
        "portfolio",
        "showcase",
        "traveling",
        tripName,
      ]}
      fullScreen={true}
    >
      <GalleryPage path={`photography/${tripName}`} title={readableName} images={images} />
    </Layout>
  );
}

type StaticProps = {
  params: { tripName: string };
};

export async function getStaticPaths() {
  const tripNames = getPhotographyTripNames();

  return {
    paths: tripNames.map((tripName: string) => {
      return { params: { tripName } };
    }),
    fallback: false,
  };
}

export async function getStaticProps({ params }: StaticProps) {
  const { tripName } = params;
  const prefix = photographyFolder + tripName + "/";
  const images = getDataFromMetadata(prefix);

  return { props: { images, tripName: params.tripName } };
}

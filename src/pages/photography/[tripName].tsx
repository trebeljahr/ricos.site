import { BreadCrumbs } from "@components/BreadCrumbs";
import { InfiniteScrollGallery } from "@components/Galleries";
import Layout from "@components/Layout";
import { ToTopButton } from "@components/ToTopButton";
import { useMemo } from "react";
import type { ImageProps } from "src/@types";
import {
  getDataFromMetadata,
  getPhotographyTripNames,
  photographyFolder,
} from "src/lib/imageMetadata";
import { imageSizes, nextImageUrl } from "src/lib/mapToImageProps";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";
import { trips } from "../photography";

export default function SinglePhotographyShowcasePage({
  images,
  tripName,
}: {
  images: ImageProps[];
  tripName: string;
}) {
  // Memoized: the largest gallery is 572 images x 16 sizes = 9,152 objects,
  // which was rebuilt on every render. `images` is a stable prop from
  // getStaticProps, so this only runs when navigating to another trip.
  const imagesWithSrcSet = useMemo(
    () =>
      images.map((image) => {
        // Math.round() collapsed the aspect ratio to an integer (a 3:2
        // landscape photo became 1), so every srcSet entry carried a wrong
        // height and react-photo-album reserved the wrong box.
        const aspectRatio = image.height / image.width;
        return {
          ...image,
          srcSet: imageSizes.map((size) => ({
            src: nextImageUrl(image.src, size),
            width: size,
            height: Math.round(aspectRatio * size),
          })),
        };
      }),
    [images],
  );

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
      <main className="py-20 px-3 max-w-5xl mx-auto">
        <BreadCrumbs path={`photography/${tripName}`} />

        <section>
          <h1 className="text-4xl mt-16!">{turnKebabIntoTitleCase(tripName)}</h1>
          <InfiniteScrollGallery images={imagesWithSrcSet} />
          <ToTopButton />
        </section>
      </main>
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

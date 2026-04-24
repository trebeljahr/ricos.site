import { BreadCrumbs } from "@components/BreadCrumbs";
import { InfiniteScrollGallery } from "@components/Galleries";
import Layout from "@components/Layout";
import { ToTopButton } from "@components/ToTopButton";
import type { ImageProps } from "src/@types";
import { getDataFromMetadata, photographyFolder } from "src/lib/imageMetadata";
import { getLocalMetadata } from "src/lib/imageMetadata";
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
  const imagesWithSrcSet = images.map((image) => {
    return {
      ...image,
      srcSet: imageSizes.map((size) => {
        const aspectRatio = Math.round(image.height / image.width);
        return {
          src: nextImageUrl(image.src, size),
          width: size,
          height: aspectRatio * size,
        };
      }),
    };
  });

  const tripMeta = trips.find(({ name }) => name === tripName) || {
    src: "/assets/blog/photography.png",
    alt: "a high quality rendering of an old film camera",
  };

  const readableName = turnKebabIntoTitleCase(tripName);
  const photoCount = images.length;

  return (
    <Layout
      title={`${readableName} Photography – Rico Trebeljahr`}
      description={`Browse ${photoCount} photos from ${readableName}. Travel photography by Rico Trebeljahr capturing landscapes, people, and moments from around the world.`}
      url={`/photography/${tripName}`}
      image={tripMeta.src}
      imageAlt={tripMeta.alt}
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
  const tripNames = [
    ...new Set(
      Object.keys(getLocalMetadata())
        .filter((key: string) => key.startsWith(photographyFolder))
        .map((key: string) => key.replace(photographyFolder, "").split("/")[0])
        .filter(Boolean),
    ),
  ].sort();

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

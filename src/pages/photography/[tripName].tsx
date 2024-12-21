import { BreadCrumbs, turnKebabIntoTitleCase } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NiceGallery } from "@components/NiceGallery";
import { ToTopButton } from "@components/ToTopButton";
import { ImageProps } from "src/@types";
import { getDataFromS3, getS3Folders, photographyFolder } from "src/lib/aws";
import { imageSizes, nextImageUrl } from "src/lib/mapToImageProps";

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

  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url={`/photography/${tripName}`}
      fullScreen={true}
    >
      <main className="mb-20 px-3">
        <BreadCrumbs path={`photography/${tripName}`} />

        <section>
          <h1 className="text-4xl mt-16">{turnKebabIntoTitleCase(tripName)}</h1>
          <NiceGallery images={imagesWithSrcSet} />
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
  try {
    const awsImageData = await getDataFromS3({
      prefix,
    });

    return { props: { images: awsImageData, tripName: params.tripName } };
  } catch (error) {
    console.error(error);
  }
}

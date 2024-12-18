import { BreadCrumbs, turnKebabIntoTitleCase } from "@components/BreadCrumbs";
import Layout from "@components/Layout";
import { NiceGallery } from "@components/NiceGallery";
import { ToTopButton } from "@components/ToTopButton";
import { ImageProps } from "src/@types";
import { getDataFromS3, getS3Folders, photographyFolder } from "src/lib/aws";
import { transformToImageProps } from "src/lib/mapToImageProps";

export default function SinglePhotographyShowcasePage({
  images,
  tripName,
}: {
  images: ImageProps[];
  tripName: string;
}) {
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
        <NiceGallery images={images} />
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
  try {
    const awsImageData = await getDataFromS3({
      prefix,
    });

    const images: ImageProps[] = awsImageData.map(transformToImageProps);

    return { props: { images, tripName: params.tripName } };
  } catch (error) {
    console.error(error);
  }
}

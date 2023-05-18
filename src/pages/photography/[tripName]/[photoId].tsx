import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import Carousel from "../../../components/image-gallery/Carousel";
import type { ImageProps } from "../../../utils/types";
import { getS3ImageData } from "src/lib/aws";

const Home = ({
  currentPhoto,
  allImages,
}: {
  currentPhoto: ImageProps;
  allImages: ImageProps[];
}) => {
  const router = useRouter();
  const { photoId } = router.query;
  let index = Number(photoId);

  if (!currentPhoto) return null;

  const currentPhotoUrl = `${process.env.NEXT_PUBLIC_STATIC_FILE_URL}/photography${currentPhoto.name}`;

  console.log(currentPhoto);

  return (
    <>
      <Head>
        <title>Next.js Conf 2022 Photos</title>
        <meta property="og:image" content={currentPhotoUrl} />
        <meta name="twitter:image" content={currentPhotoUrl} />
      </Head>
      <main className="mx-auto max-w-[1960px] p-4">
        <Carousel
          currentPhoto={currentPhoto}
          index={index}
          images={allImages}
        />
      </main>
    </>
  );
};

export default Home;

export async function getStaticPaths() {
  const allStorageObjects = await getS3ImageData();
  // console.log("all images", allStorageObjects);
  const indeces: Record<string, number> = {};
  const paths = allStorageObjects.map((imagePathName) => {
    const [tripName] = imagePathName.split("/");
    indeces[tripName] = indeces[tripName] + 1 || 0;

    return {
      params: { tripName, photoId: String(indeces[tripName]) },
    };
  });

  // console.log(indeces);

  // console.log(paths);

  return {
    paths,
    fallback: false,
  };
}

export const getStaticProps: GetStaticProps = async (context) => {
  console.log({ context });

  const imagesForBucket = await getS3ImageData({
    prefix: context.params?.tripName as string,
  });

  const allImages = imagesForBucket.map((name, index) => {
    return {
      tripName: context.params?.tripName as string,
      index,
      name,
      url: `https://${process.env.NEXT_PUBLIC_STATIC_FILE_URL}/photography/${name}`,
    };
  });

  console.log({ allImages });
  const index = Number(context.params?.photoId);

  const currentPhoto: ImageProps = allImages[index];

  console.log(currentPhoto);
  return {
    props: {
      currentPhoto,
      allImages,
    },
  };
};

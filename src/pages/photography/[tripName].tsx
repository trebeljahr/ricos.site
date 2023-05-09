import Image from "next/image";
import { getImageSources, getS3Folders, getS3ImageData } from "src/lib/aws";
import Layout from "../../components/layout";

export default function Page({
  imageFileNames,
  tripName,
}: {
  tripName: string;
  imageFileNames: string[];
}) {
  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url={`/photography/${tripName}`}
    >
      {getImageSources({ imageFileNames }).map(({ src }, index) => {
        return (
          <Image
            key={index}
            src={src}
            width="6"
            height="4"
            alt={src}
            sizes="100vw"
            style={{
              width: "100%",
              height: "auto",
              objectFit: "cover",
            }}
          />
        );
      })}
    </Layout>
  );
}

export async function getStaticPaths() {
  const tripNames = await getS3Folders();

  console.log(tripNames);

  return {
    paths: tripNames.map((tripName) => {
      return { params: { tripName } };
    }),
    fallback: false,
  };
}

type StaticProps = {
  params: { tripName: string };
};

export async function getStaticProps({ params }: StaticProps) {
  const imageFileNames = await getS3ImageData({
    prefix: params.tripName,
  });

  return { props: { imageFileNames } };
}

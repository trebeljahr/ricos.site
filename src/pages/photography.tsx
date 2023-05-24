import Link from "next/link";
import Layout from "../components/layout";
import { getS3Folders, getS3ImageData } from "src/lib/aws";
import { ImageProps } from "src/utils/types";
import Image from "next/image";
import { mapToImageProps } from "src/lib/mapToImageProps";

export default function Photography({
  trips,
}: {
  trips: { image: ImageProps; tripName: string }[];
}) {
  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url="photography"
      fullScreen={true}
    >
      <h1>Photography</h1>
      <div className="flex w-full flex-wrap">
        {trips.map(({ tripName, image }) => {
          return (
            <Link
              href={`/photography/${tripName}`}
              key={tripName}
              className="relative w-1/2 aspect-square overflow-hidden basis-1/2 flex-shrink-0"
            >
              <Image
                src={image.src}
                sizes={"calc(50vw - 40px)"}
                blurDataURL={image.blurDataURL}
                fill
                alt={"A photo from " + tripName}
                className="absolute inset-0 z-0 object-cover w-full h-full hover:scale-105 transition-all duration-300 ease-in-out"
              />
              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center w-full h-full bg-black bg-opacity-40">
                <span className="text-xl  text-white">{tripName}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const tripNames = await getS3Folders();
  const trips = await Promise.all(
    tripNames.map(async (tripName) => {
      const [firstImage] = await getS3ImageData({ prefix: tripName });
      const [image] = await mapToImageProps([firstImage], tripName);

      return { image, tripName };
    })
  );

  console.log(trips);

  return { props: { trips } };
}

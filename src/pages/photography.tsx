import Image from "next/image";
import Link from "next/link";
import { getS3Folders, getS3ImageData } from "src/lib/aws";
import { mapToImageProps } from "src/lib/mapToImageProps";
import { ImageProps } from "src/utils/types";
import Layout from "../components/layout";

const tripNameMap: Record<string, string> = {
  "2020-alps": "Traumpfad",
  "2022-tenerife": "Tenerife",
  "2022-india": "North India",
  "2022-germany": "Germany",
  "2021-crete": "Crete",
  "2020-india": "South India",
  "2019-india": "West India",
};

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
      {/* <h1>Photography</h1> */}
      {/* <p>
        A great attitude becomes a great day which becomes a great month which
        becomes a great year which becomes a great life.
      </p>
      <p>– Mandy Hale</p> */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {trips.map(({ tripName, image }) => {
          return (
            <Link
              href={`/photography/${tripName}`}
              key={tripName}
              className="relative aspect-square overflow-hidden flex-shrink-0"
            >
              <Image
                src={image.src}
                sizes={"calc(50vw - 40px)"}
                blurDataURL={image.blurDataURL}
                fill
                alt={"A photo from " + tripName}
                className="absolute inset-0 z-0 object-cover w-full h-full hover:scale-105 transition-all duration-300 ease-in-out bg-gray-50"
              />
              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center w-full h-full bg-black bg-opacity-40">
                <h2 className="text-xl font-bold text-white">
                  {tripNameMap[tripName]}
                </h2>
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

  return { props: { trips } };
}

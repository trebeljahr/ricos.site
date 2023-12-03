import Image from "next/image";
import Link from "next/link";
import { turnKebabIntoTitleCase } from "src/components/BreadCrumbs";
import { getDataFromS3, photographyFolder } from "src/lib/aws";
import { mapToImageProps } from "src/lib/mapToImageProps";
import { ImageProps } from "src/utils/types";
import Layout from "../components/layout";

const tripNames = [
  "alps",
  "crete",
  "east-india",
  "germany",
  "indonesia",
  "laos",
  "rajasthan",
  "sri-lanka",
  "thailand",
  "vietnam",
  "central-india",
  "delhi",
  "egypt",
  "himachal-pradesh",
  "italy",
  "nepal",
  "south-india",
  "tenerife",
  "varanasi",
];

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
      <h1 style={{ marginTop: "-2rem", marginBottom: "1rem" }}>Photography</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-20">
        {trips.map(({ tripName, image }, index) => {
          return (
            <Link
              href={`/photography/${tripName}`}
              key={tripName}
              className="relative aspect-square overflow-hidden flex-shrink-0 bg-gray-100"
            >
              <Image
                src={image.src}
                sizes={"calc(50vw - 40px)"}
                blurDataURL={image.blurDataURL}
                fill
                priority={index <= 3}
                alt={"A photo from " + tripName}
                style={{ filter: "brightness(50%)" }}
                className="absolute inset-0 z-0 object-cover w-full h-full hover:scale-105 transition-all duration-300 ease-in-out  "
              />
              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center w-full h-full">
                <h2 className="text-xl font-bold text-white">
                  {turnKebabIntoTitleCase(tripName)}
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
  const trips = await Promise.all(
    tripNames.map(async (tripName) => {
      const [firstImage] = await getDataFromS3({
        prefix: photographyFolder + tripName,
        numberOfItems: 1,
      });
      const [image] = mapToImageProps(
        [firstImage],
        photographyFolder + tripName
      );

      return { image, tripName };
    })
  );

  return { props: { trips } };
}

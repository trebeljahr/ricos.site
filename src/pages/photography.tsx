import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import Link from "next/link";
import { ImageProps } from "src/@types";
import { getFirstImageFromS3, photographyFolder } from "src/lib/aws";
import { turnKebabIntoTitleCase } from "src/lib/utils";

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
  "guadeloupe",
  "transat",
  "portugal-2024",
  "india-2023",
  "martinique",
  "colombia-2024",
];

export default function Photography({
  trips,
}: {
  trips: { image: ImageProps; tripName: string }[];
}) {
  const url = "photography";
  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url={url}
      fullScreen={true}
    >
      <main className="mb-20 px-3">
        <BreadCrumbs path={url} />

        <Header subtitle="My travels in pictures" title="Photography" />
        <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-2 mb-20">
          {trips.map(({ tripName, image }, index) => {
            return (
              <Link
                href={`/photography/${tripName}`}
                key={tripName}
                className="relative aspect-square overflow-hidden flex-shrink-0 "
              >
                <ImageWithLoader
                  src={image.src}
                  sizes={"calc(50vw - 40px)"}
                  fill
                  priority={index < 2}
                  alt={"A photo from " + tripName}
                  style={{ filter: "brightness(50%)" }}
                  className="absolute inset-0 z-0 object-cover w-full h-full hover:scale-105 transform transition-transform duration-300 ease-in-out"
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
      </main>
    </Layout>
  );
}

export async function getStaticProps() {
  const trips = await Promise.all(
    tripNames.map(async (tripName) => {
      const image = await getFirstImageFromS3({
        prefix: photographyFolder + tripName,
      });

      return { image, tripName };
    })
  );

  return { props: { trips } };
}

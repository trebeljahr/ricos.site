import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import Link from "next/link";
import { ImageProps } from "src/@types";
import { getFirstImageFromS3, photographyFolder } from "src/lib/aws";
import { getImgWidthAndHeightDuringBuild } from "src/lib/getImgWidthAndHeightDuringBuild";
import { turnKebabIntoTitleCase } from "src/lib/utils";

const trips = [
  {
    src: "/assets/photography/best-of/DSC02311-2.webp",
    alt: "reflection at the Taj Mahal, Agra, India, surreal looking upside down image",
    name: "best-of",
  },
  {
    src: "/assets/photography/best-of/DSC04904-38054.webp",
    alt: "man with a yellow jacket hiking in the Alps, with a beautiful view of the mountains and a pristine mountain lake in the background",
    name: "alps",
  },
  {
    src: "/assets/photography/best-of/DSC08919-41892.webp",
    alt: "beautiful beach in Chrissy, Crete, Greece, with turquoise water and gentle, soft morning light",
    name: "crete",
  },
  { src: "", alt: "", name: "east-india" },
  {
    src: "/assets/photography/best-of/DSC00984.webp",
    alt: "a man standing in beautiful sunlight in the autumn forest",
    name: "germany",
  },
  {
    src: "/assets/photography/best-of/DSC00940.webp",
    alt: "green island in Indonesia Komodo national park",
    name: "indonesia",
  },
  {
    src: "/assets/photography/best-of/DSC04727.webp",
    alt: "Pha That Luang, the Golden Stupa in Vientiane Laos",
    name: "laos",
  },
  {
    src: "/assets/photography/best-of/DSC02563.webp",
    alt: "elephants riding down the street near the main fort Jaipur, Rajasthan, India",
    name: "rajasthan",
  },
  {
    src: "/assets/photography/best-of/DSC04986-3.webp",
    alt: "long time exposure with streaking effect of the Ravana waterfalls in Ella, Sri Lanka",
    name: "sri-lanka",
  },
  {
    src: "/assets/photography/thailand/DSC08256.webp",
    alt: "Wat Rong Khun, White Temple in Chiang Rai, Thailand",
    name: "thailand",
  },
  {
    src: "/assets/photography/best-of/DSC03117.webp",
    alt: "mystical carst mountain formations near Bai Tu Long Bay, Vietnam",
    name: "vietnam",
  },
  { src: "", alt: "", name: "central-india" },
  { src: "", alt: "", name: "dominica" },
  { src: "", alt: "", name: "delhi" },
  { src: "", alt: "", name: "egypt" },
  {
    src: "/assets/photography/best-of/DSC02531-54305-Pano.webp",
    alt: "Chandratal lake in the middle of Himachal Pradesh near Spiti Valley at 4200 meters",
    name: "himachal-pradesh",
  },
  {
    src: "/assets/photography/best-of/IMG_8960.webp",
    alt: "ice surrounding the apple bloom in the spring in the Alps in Italy, South Tyrol",
    name: "italy",
  },
  {
    src: "/assets/photography/nepal/DSC07690 (2).webp",
    alt: "looking onto the Annapurna mountain range, specifically the Fish Tail mountain in Nepal",
    name: "nepal",
  },
  { src: "", alt: "", name: "south-india" },
  {
    src: "/assets/photography/best-of/DSC02444.webp",
    alt: "man in yellow sweater walking on the edge of a mountain range in Anaga Tenerife",
    name: "tenerife",
  },
  { src: "", alt: "", name: "varanasi" },
  { src: "", alt: "", name: "guadeloupe" },
  { src: "", alt: "", name: "transat" },
  { src: "", alt: "", name: "portugal-2024" },
  {
    src: "/assets/photography/india-2023/PXL_20230930_051423720~2.jpg",
    alt: "woman standing in front of a cliff in the Himalayas on the Markha Valley trek in Ladakh, India",
    name: "india-2023",
  },
  { src: "", alt: "", name: "martinique" },
  { src: "", alt: "", name: "colombia-2024" },
];

type Props = {
  trips: { image: ImageProps; tripName: string }[];
};

export default function Photography({ trips }: Props) {
  const url = "photography";
  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url={url}
      fullScreen={true}
      image="/assets/blog/photography.png"
      imageAlt="a high quality rendering of an old film camera"
      keywords={[
        "photography",
        "gallery",
        "images",
        "photos",
        "art",
        "pictures",
        "portfolio",
        "showcase",
      ]}
    >
      <main className="mb-20 px-3 max-w-7xl mx-auto">
        <BreadCrumbs path={url} />

        <Header subtitle="My travels in pictures" title="Photography" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-20">
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

export async function getStaticProps(): Promise<{ props: Props }> {
  const tripsMeta = await Promise.all(
    trips.map(async ({ name, src, alt }) => {
      if (src === "") {
        const image = await getFirstImageFromS3({
          prefix: photographyFolder + name,
        });
        return { image, tripName: name };
      }

      const { width, height } = await getImgWidthAndHeightDuringBuild(src);

      return { image: { width, height, src, alt }, tripName: name };
    })
  );

  return { props: { trips: tripsMeta } };
}

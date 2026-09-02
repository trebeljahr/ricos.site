import { BreadCrumbs } from "@components/BreadCrumbs";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import Link from "next/link";
import type { ImageProps } from "src/@types";
import { getImgWidthAndHeightDuringBuild } from "src/lib/getImgWidthAndHeightDuringBuild";
import type { SeoInfo } from "src/lib/getSeoInfo";
import {
  getFirstImageFromMetadata,
  getPhotographyTripNames,
  photographyFolder,
} from "src/lib/imageMetadata";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

export const trips = [
  {
    src: "/assets/photography/best-of/DSC02311-2.webp",
    alt: "reflection at the Taj Mahal, Agra, India, surreal looking upside down image",
    name: "best-of",
    description:
      "A curated set spanning every trip — favorite frames from the Himalayas, the Caribbean, Southeast Asia, and a few quieter corners in between.",
  },
  {
    src: "/assets/photography/best-of/DSC04904-38054.webp",
    alt: "man with a yellow jacket hiking in the Alps, with a beautiful view of the mountains and a pristine mountain lake in the background",
    name: "alps",
    description:
      "Hut-to-hut hiking in the Austrian and Italian Alps. Mountain lakes, larch forests, and long ridgeline days under thin air.",
  },
  {
    src: "/assets/photography/best-of/DSC08919-41892.webp",
    alt: "beautiful beach in Chrissy, Crete, Greece, with turquoise water and gentle, soft morning light",
    name: "crete",
    description:
      "Coastlines, mountain villages, and turquoise coves on the largest Greek island. Mostly early mornings before the heat hit.",
  },
  {
    src: "",
    alt: "",
    name: "east-india",
    description:
      "Kolkata street life, the colonial bones of the old town, and the slow river ferries crossing the Hooghly at dusk.",
  },
  {
    src: "/assets/photography/best-of/DSC00984.webp",
    alt: "a man standing in beautiful sunlight in the autumn forest",
    name: "germany",
    description:
      "Home turf — autumn forests, foggy mornings near the Baltic coast, and the quieter side of a country I usually only photograph by accident.",
  },
  {
    src: "/assets/photography/best-of/DSC00940.webp",
    alt: "green island in Indonesia Komodo national park",
    name: "indonesia",
    description:
      "Komodo National Park from a liveaboard boat — pink beaches, green islands rising straight out of the sea, and the dragons themselves.",
  },
  {
    src: "/assets/photography/best-of/DSC04727.webp",
    alt: "Pha That Luang, the Golden Stupa in Vientiane Laos",
    name: "laos",
    description:
      "Slow-boating down the Mekong, the temples of Luang Prabang at sunrise, and the Golden Stupa of Vientiane glowing at dusk.",
  },
  {
    src: "/assets/photography/best-of/DSC02563.webp",
    alt: "elephants riding down the street near the main fort Jaipur, Rajasthan, India",
    name: "rajasthan",
    description:
      "The pink city of Jaipur, fort-strewn deserts around Jodhpur and Jaisalmer, and elephants ambling past the Amber Fort gates.",
  },
  {
    src: "/assets/photography/best-of/DSC04986-3.webp",
    alt: "long time exposure with streaking effect of the Ravana waterfalls in Ella, Sri Lanka",
    name: "sri-lanka",
    description:
      "Tea-country hills around Ella, long-exposure waterfalls, and the southern beaches before the monsoon broke.",
  },
  {
    src: "/assets/photography/thailand/DSC08256.webp",
    alt: "Wat Rong Khun, White Temple in Chiang Rai, Thailand",
    name: "thailand",
    description:
      "Chiang Rai's White Temple, the limestone karsts of the south, and Bangkok night markets — a first taste of Southeast Asia.",
  },
  {
    src: "/assets/photography/best-of/DSC03117.webp",
    alt: "mystical carst mountain formations near Bai Tu Long Bay, Vietnam",
    name: "vietnam",
    description:
      "Bai Tu Long Bay's lesser-known karst islands, Hanoi's old quarter at night, and the long winding ride north toward the Chinese border.",
  },
  {
    src: "",
    alt: "",
    name: "central-india",
    description:
      "Tiger reserves and dense sal forests in Madhya Pradesh, plus the temple complexes of Khajuraho and Orchha.",
  },
  {
    src: "",
    alt: "",
    name: "dominica",
    description:
      "The Caribbean's Nature Island — Boiling Lake, Trafalgar Falls, Emerald Pool, and rainforest hikes that left everything soaking wet.",
  },
  {
    src: "",
    alt: "",
    name: "delhi",
    description:
      "Old Delhi street life, Humayun's Tomb, Jama Masjid at dawn, and the Lodi Gardens in the smog-soft winter light.",
  },
  {
    src: "",
    alt: "",
    name: "egypt",
    description:
      "Cairo's pyramids and bazaars, the temples of Luxor and Karnak, and a slow felucca down the Nile toward Aswan.",
  },
  {
    src: "/assets/photography/best-of/DSC02531-54305-Pano.webp",
    alt: "Chandratal lake in the middle of Himachal Pradesh near Spiti Valley at 4200 meters",
    name: "himachal-pradesh",
    description:
      "Spiti Valley at 4200 m — Chandratal lake, ancient monasteries clinging to cliffs, and the desolate beauty of the Indian Himalayas.",
  },
  {
    src: "/assets/photography/best-of/IMG_8960.webp",
    alt: "ice surrounding the apple bloom in the spring in the Alps in Italy, South Tyrol",
    name: "italy",
    description:
      "Dolomites trail days, the apple blossom in South Tyrol caught in a late frost, and small-town Italy from Tuscany to the alpine north.",
  },
  {
    src: "/assets/photography/nepal/DSC07690 (2).webp",
    alt: "looking onto the Annapurna mountain range, specifically the Fish Tail mountain in Nepal",
    name: "nepal",
    description:
      "The Annapurna Circuit — Machapuchare at sunrise, prayer flags strung over high passes, and tea houses at the edge of the snow line.",
  },
  {
    src: "",
    alt: "",
    name: "south-india",
    description:
      "Backwaters of Kerala, the colonial waterfront of Kochi, and the tea hills around Munnar in early morning fog.",
  },
  {
    src: "/assets/photography/best-of/DSC02444.webp",
    alt: "man in yellow sweater walking on the edge of a mountain range in Anaga Tenerife",
    name: "tenerife",
    description:
      "Hiking the Anaga ridge, Teide's volcanic landscape above the clouds, and quieter coves on the island's wild north coast.",
  },
  {
    src: "",
    alt: "",
    name: "varanasi",
    description:
      "Ghats along the Ganges at dawn, evening aarti ceremonies by the river, and the impossibly dense old streets of one of India's oldest cities.",
  },
  {
    src: "",
    alt: "",
    name: "guadeloupe",
    description:
      "Hiking the GR-G1 across Basse-Terre's jungle, diving the Caribbean reefs, and waterfall-hopping between hostels on the French Antilles.",
  },
  {
    src: "",
    alt: "",
    name: "transat",
    description:
      "Crossing the Atlantic by sailboat — three weeks at sea, storms and stars, and the slow rhythm of life on a 40-foot cutter.",
  },
  {
    src: "",
    alt: "",
    name: "portugal-2024",
    description:
      "The Rota Vicentina — hiking the Fisherman's Trail along Alentejo's wild coast, plus quieter inland villages and the Algarve cliffs.",
  },
  {
    src: "",
    alt: "",
    name: "spain-2024",
    description:
      "Madrid and Barcelona in autumn — rooftop views, window reflections, old bars, and the flight down the Iberian coast.",
  },
  {
    src: "/assets/photography/india-2023/PXL_20230930_051423720~2.jpg",
    alt: "woman standing in front of a cliff in the Himalayas on the Markha Valley trek in Ladakh, India",
    name: "india-2023",
    description:
      "Ladakh and the Markha Valley trek — high-altitude desert, Buddhist monasteries, and the long road from Leh to Manali.",
  },
  {
    src: "",
    alt: "",
    name: "martinique",
    description:
      "Fort-de-France, the Tombolo sandbank, giant trees in the rainforest, and the Schoelcher Library's strange wrought-iron beauty.",
  },
  {
    src: "",
    alt: "",
    name: "colombia-2024",
    description:
      "Coffee triangle hills, the colonial streets of Cartagena, and the trail into the jungle toward Ciudad Perdida.",
  },
];

type Props = {
  trips: { image: ImageProps; tripName: string }[];
  seo: SeoInfo | null;
};

export default function Photography({ trips, seo }: Props) {
  const url = "photography";
  return (
    <Layout
      title={seo?.metaTitle || "Photography"}
      description={
        seo?.metaDescription ||
        "Travel photography by Rico Trebeljahr — landscapes, people, and moments from journeys across Asia, Europe, the Caribbean, and South America."
      }
      url={url}
      fullScreen={true}
      image={seo?.ogImage || "/assets/blog/photography.png"}
      imageAlt={seo?.ogImageAlt || "a high quality rendering of an old film camera"}
      keywords={seo?.keywords || ["photography", "gallery", "photos", "portfolio"]}
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
                className="relative aspect-square overflow-hidden shrink-0 "
              >
                <ImageWithLoader
                  src={image.src}
                  sizes={"calc(50vw - 40px)"}
                  width={image.width}
                  height={image.height}
                  priority={index === 0}
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
  // The `/photography/[tripName]` routes are generated from the image metadata,
  // not from `trips`. Deriving this index from the same source keeps the two in
  // sync: a gallery folder that nobody added to `trips` still gets listed here
  // instead of becoming an orphan page, and a curated entry whose folder is gone
  // no longer produces a dead link. `trips` only supplies order and cover images.
  const galleryNames = getPhotographyTripNames();
  const curatedNames = new Set(trips.map(({ name }) => name));

  const listedTrips = [
    ...trips.filter(({ name }) => galleryNames.includes(name)),
    ...galleryNames
      .filter((name) => !curatedNames.has(name))
      .map((name) => ({ name, src: "", alt: "" })),
  ];

  const tripsMeta = await Promise.all(
    listedTrips.map(async ({ name, src, alt }) => {
      if (src === "") {
        const image = getFirstImageFromMetadata(photographyFolder + name);
        return { image, tripName: name };
      }

      const { width, height } = await getImgWidthAndHeightDuringBuild(src);

      return { image: { width, height, src, alt }, tripName: name };
    }),
  );

  const { getSeoInfo } = await import("src/lib/getSeoInfo");
  return { props: { trips: tripsMeta, seo: getSeoInfo("/photography") } };
}

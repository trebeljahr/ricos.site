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
      "My favourite frames from every trip, in one gallery. Himalayas, Caribbean, Southeast Asia and a lot of places in between.",
  },
  {
    src: "/assets/photography/best-of/DSC04904-38054.webp",
    alt: "man with a yellow jacket hiking in the Alps, with a beautiful view of the mountains and a pristine mountain lake in the background",
    name: "alps",
    description:
      "Hut-to-hut hiking in the Austrian and Italian Alps. Long days on the ridgelines, with mountain lakes and larch forests on the way down.",
  },
  {
    src: "/assets/photography/best-of/DSC08919-41892.webp",
    alt: "beautiful beach in Chrissy, Crete, Greece, with turquoise water and gentle, soft morning light",
    name: "crete",
    description:
      "Coastlines, mountain villages and turquoise coves on Crete. Shot mostly in the early morning, before the heat.",
  },
  {
    src: "",
    alt: "",
    name: "east-india",
    description:
      "Street life in the old colonial parts of Kolkata, and the slow ferries crossing the Hooghly at dusk.",
  },
  {
    src: "/assets/photography/best-of/DSC00984.webp",
    alt: "a man standing in beautiful sunlight in the autumn forest",
    name: "germany",
    description:
      "Home turf. Autumn forests, foggy mornings near the Baltic coast and a country I usually only photograph by accident.",
  },
  {
    src: "/assets/photography/best-of/DSC00940.webp",
    alt: "green island in Indonesia Komodo national park",
    name: "indonesia",
    description:
      "Komodo National Park from a liveaboard boat. Pink beaches, green islands rising straight out of the sea and the dragons.",
  },
  {
    src: "/assets/photography/best-of/DSC04727.webp",
    alt: "Pha That Luang, the Golden Stupa in Vientiane Laos",
    name: "laos",
    description:
      "A slow boat down the Mekong, the temples of Luang Prabang at sunrise and the Golden Stupa in Vientiane at dusk.",
  },
  {
    src: "/assets/photography/best-of/DSC02563.webp",
    alt: "elephants riding down the street near the main fort Jaipur, Rajasthan, India",
    name: "rajasthan",
    description:
      "Jaipur, the pink city. Forts in the desert around Jodhpur and Jaisalmer, and elephants walking up to the Amber Fort.",
  },
  {
    src: "/assets/photography/best-of/DSC04986-3.webp",
    alt: "long time exposure with streaking effect of the Ravana waterfalls in Ella, Sri Lanka",
    name: "sri-lanka",
    description:
      "Tea country around Ella, long exposures of waterfalls and the beaches in the south, right before the monsoon.",
  },
  {
    src: "/assets/photography/thailand/DSC08256.webp",
    alt: "Wat Rong Khun, White Temple in Chiang Rai, Thailand",
    name: "thailand",
    description:
      "My first trip to Southeast Asia. The White Temple in Chiang Rai, the limestone karsts in the south and the night markets of Bangkok.",
  },
  {
    src: "/assets/photography/best-of/DSC03117.webp",
    alt: "mystical carst mountain formations near Bai Tu Long Bay, Vietnam",
    name: "vietnam",
    description:
      "The quieter karst islands of Bai Tu Long Bay, Hanoi's old quarter at night and the long ride north towards the Chinese border.",
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
      "The Nature Island of the Caribbean. Boiling Lake, Trafalgar Falls, Emerald Pool and rainforest hikes that left everything soaking wet.",
  },
  {
    src: "",
    alt: "",
    name: "delhi",
    description:
      "Old Delhi street life, Humayun's Tomb, Jama Masjid at dawn and the Lodi Gardens in the hazy winter light.",
  },
  {
    src: "",
    alt: "",
    name: "egypt",
    description:
      "The pyramids and bazaars of Cairo, the temples of Luxor and Karnak. Then a felucca down the Nile to Aswan.",
  },
  {
    src: "/assets/photography/best-of/DSC02531-54305-Pano.webp",
    alt: "Chandratal lake in the middle of Himachal Pradesh near Spiti Valley at 4200 meters",
    name: "himachal-pradesh",
    description:
      "Spiti Valley at 4200 m. Chandratal lake, old monasteries built into the cliffs and a lot of empty high-altitude nothing.",
  },
  {
    src: "/assets/photography/best-of/IMG_8960.webp",
    alt: "ice surrounding the apple bloom in the spring in the Alps in Italy, South Tyrol",
    name: "italy",
    description:
      "Hiking in the Dolomites, apple blossom in South Tyrol caught by a late frost, and small towns from Tuscany up to the Alps.",
  },
  {
    src: "/assets/photography/nepal/DSC07690 (2).webp",
    alt: "looking onto the Annapurna mountain range, specifically the Fish Tail mountain in Nepal",
    name: "nepal",
    description:
      "The Annapurna Circuit. Machapuchare at sunrise, prayer flags on the high passes and tea houses just below the snow line.",
  },
  {
    src: "",
    alt: "",
    name: "south-india",
    description:
      "The backwaters of Kerala and the old waterfront in Kochi. Plus the tea hills around Munnar, usually in fog.",
  },
  {
    src: "/assets/photography/best-of/DSC02444.webp",
    alt: "man in yellow sweater walking on the edge of a mountain range in Anaga Tenerife",
    name: "tenerife",
    description:
      "Hiking the Anaga ridge, the volcanic landscape around Teide above the clouds, and small coves on the wild north coast.",
  },
  {
    src: "",
    alt: "",
    name: "varanasi",
    description:
      "One of the oldest cities in India. Ghats along the Ganges at dawn, aarti ceremonies by the river in the evening and streets narrow enough to get lost in.",
  },
  {
    src: "",
    alt: "",
    name: "guadeloupe",
    description:
      "Hiking the GR-G1 through the jungle of Basse-Terre, diving the reefs and going from waterfall to waterfall across the French Antilles.",
  },
  {
    src: "",
    alt: "",
    name: "transat",
    description:
      "Crossing the Atlantic on a 40-foot sailboat. Three weeks at sea, storms, stars and not a lot else.",
  },
  {
    src: "",
    alt: "",
    name: "portugal-2024",
    description:
      "The Rota Vicentina. Hiking the Fisherman's Trail along the coast of the Alentejo, plus inland villages and the cliffs of the Algarve.",
  },
  {
    src: "",
    alt: "",
    name: "spain-2024",
    description:
      "Madrid and Barcelona in autumn. Rooftops, reflections in windows, old bars and the flight down the Iberian coast.",
  },
  {
    src: "/assets/photography/india-2023/PXL_20230930_051423720~2.jpg",
    alt: "woman standing in front of a cliff in the Himalayas on the Markha Valley trek in Ladakh, India",
    name: "india-2023",
    description:
      "Ladakh and the Markha Valley trek. High-altitude desert, Buddhist monasteries and the long road from Leh to Manali.",
  },
  {
    src: "",
    alt: "",
    name: "martinique",
    description:
      "Fort-de-France, the Tombolo sandbank, giant trees in the rainforest and the strange wrought-iron Schoelcher Library.",
  },
  {
    src: "",
    alt: "",
    name: "colombia-2024",
    description:
      "The hills of the coffee triangle, the old streets of Cartagena and the jungle trail to Ciudad Perdida.",
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
        "Travel photography by Rico Trebeljahr. Landscapes, people and moments from trips across Asia, Europe, the Caribbean and South America."
      }
      url={url}
      fullScreen={true}
      image={seo?.ogImage || "/assets/blog/photography.png"}
      imageAlt={seo?.ogImageAlt || "a high quality rendering of an old film camera"}
      keywords={seo?.keywords || ["photography", "gallery", "photos", "portfolio"]}
    >
      <main className="pt-5 pb-20 px-3 max-w-5xl mx-auto">
        <Header breadcrumbs={{ path: url }} subtitle="My travels in pictures" title="Photography" />
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
                  sizes={"(min-width: 1024px) 490px, (min-width: 768px) 50vw, 100vw"}
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

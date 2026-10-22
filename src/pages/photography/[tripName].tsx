import { GalleryPage } from "@components/GalleryPage";
import Layout from "@components/Layout";
import Link from "next/link";
import type { ImageProps } from "src/@types";
import { getPhotographyGalleryImages, getPhotographyTripNames } from "src/lib/imageMetadata";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";
import { trips } from "../photography";

type AlbumLink = { name: string; title: string };

export default function SinglePhotographyShowcasePage({
  images,
  tripName,
  previousAlbum,
  nextAlbum,
}: {
  images: ImageProps[];
  tripName: string;
  previousAlbum: AlbumLink | null;
  nextAlbum: AlbumLink | null;
}) {
  const tripMeta = trips.find(({ name }) => name === tripName) || {
    src: "/assets/blog/photography.png",
    alt: "a high quality rendering of an old film camera",
  };

  const readableName = turnKebabIntoTitleCase(tripName);
  const photoCount = images.length;

  // Several trips have no hand-picked hero shot (src: "" in `trips`). Use the
  // first photo of the gallery for those, so every gallery gets an og:image.
  const firstImage = images[0];
  const heroSrc = tripMeta.src || firstImage?.src || "";
  const heroAlt = tripMeta.alt || `A photo from ${readableName}`;
  const heroDimensions = tripMeta.src ? undefined : firstImage;

  return (
    <Layout
      title={`${readableName} Photography – Rico Trebeljahr`}
      description={`Browse ${photoCount} photos from ${readableName}. Travel photography by Rico Trebeljahr capturing landscapes, people, and moments from around the world.`}
      url={`/photography/${tripName}`}
      image={heroSrc}
      imageAlt={heroAlt}
      imageWidth={heroDimensions?.width}
      imageHeight={heroDimensions?.height}
      keywords={[
        "photography",
        "gallery",
        "images",
        "photos",
        "art",
        "pictures",
        "portfolio",
        "showcase",
        "traveling",
        tripName,
      ]}
      fullScreen={true}
    >
      <GalleryPage path={`photography/${tripName}`} title={readableName} images={images}>
        <nav
          aria-label="Photography albums"
          className="mb-group flex flex-wrap justify-between gap-4 text-sm"
        >
          {previousAlbum && (
            <Link href={`/photography/${previousAlbum.name}`} rel="prev">
              ← {previousAlbum.title}
            </Link>
          )}
          <Link href="/photography">All albums</Link>
          {nextAlbum && (
            <Link href={`/photography/${nextAlbum.name}`} rel="next">
              {nextAlbum.title} →
            </Link>
          )}
        </nav>
      </GalleryPage>
    </Layout>
  );
}

type StaticProps = {
  params: { tripName: string };
};

export async function getStaticPaths() {
  const tripNames = getPhotographyTripNames();

  return {
    paths: tripNames.map((tripName: string) => {
      return { params: { tripName } };
    }),
    fallback: false,
  };
}

export async function getStaticProps({ params }: StaticProps) {
  const { tripName } = params;
  const images = getPhotographyGalleryImages(tripName);
  const galleryNames = getPhotographyTripNames();
  const available = new Set(galleryNames);
  const curated = new Set(trips.map(({ name }) => name));
  // Match the photography index: curated albums first, then any new routes.
  const orderedNames = [
    ...trips.filter(({ name }) => available.has(name)).map(({ name }) => name),
    ...galleryNames.filter((name) => !curated.has(name)),
  ];
  const currentIndex = orderedNames.indexOf(tripName);
  const albumLink = (name: string | undefined): AlbumLink | null =>
    name ? { name, title: turnKebabIntoTitleCase(name) } : null;

  return {
    props: {
      images,
      tripName,
      previousAlbum: albumLink(orderedNames[currentIndex - 1]),
      nextAlbum: albumLink(orderedNames[currentIndex + 1]),
    },
  };
}

import { Card } from "@components/Card";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import { LEGEND_REGIONS, REGION_CSS_VARIABLES } from "@components/PhotoGlobe";
import Header from "@components/PostHeader";
import { SpinningLoader } from "@components/SpinningLoader";
import clsx from "clsx";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TripLocation, TripRegion } from "src/lib/photoGeo";

/**
 * three.js plus the land outlines are far too heavy for the eager bundle of a page that is
 * mostly text, and the scene needs a real canvas to measure itself against. Same shape as
 * the gallery components: client only, with a box of the final size held open.
 */
const PhotoGlobe = dynamic(() => import("@components/PhotoGlobe").then((m) => m.PhotoGlobe), {
  ssr: false,
  loading: () => (
    <div className={clsx(GLOBE_BOX, "flex items-center justify-center")}>
      <div className="w-8">
        <SpinningLoader />
      </div>
    </div>
  ),
});

/** One class list for the canvas and its loading placeholder, so the page never jumps. */
const GLOBE_BOX = "relative h-[60vh] min-h-[20rem] w-full sm:h-[32rem] lg:h-[36rem]";

type Thumbnail = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

/** A trip as the page needs it: the globe's fields plus the panel's copy and thumbnails. */
export type WorldTrip = TripLocation & {
  /** Curated blurb from the photography index, or `""` when that folder has none. */
  description: string;
  thumbnails: Thumbnail[];
};

type Totals = {
  /** Trips with a pin — the `best-of` curation is not a place. */
  places: number;
  /** Photos in those trips. Excludes `best-of`, whose photos repeat the other folders. */
  photos: number;
  /** How many of those photos carry EXIF GPS. */
  withGps: number;
};

type Props = {
  trips: WorldTrip[];
  totals: Totals;
};

const url = "photography/world";

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

/** Region order for the picker, so the chips read west to east rather than alphabetically. */
const REGION_ORDER: TripRegion[] = [...LEGEND_REGIONS, "Global"];

function regionRank(region: TripRegion): number {
  const index = REGION_ORDER.indexOf(region);
  return index === -1 ? REGION_ORDER.length : index;
}

export default function PhotographyWorldPage({ trips, totals }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  const placeTrips = useMemo(
    () =>
      trips
        .filter((trip) => trip.kind !== "collection")
        .sort(
          (a, b) => regionRank(a.region) - regionRank(b.region) || a.label.localeCompare(b.label),
        ),
    [trips],
  );

  const selectedTrip = useMemo(
    () => placeTrips.find((trip) => trip.name === selected) ?? null,
    [placeTrips, selected],
  );

  const handleSelect = useCallback((tripName: string | null) => setSelected(tripName), []);

  // The panel sits under the globe, so on a phone a tap on a pin otherwise changes
  // something the reader cannot see.
  useEffect(() => {
    if (!selected || !panel.current) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.current.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "nearest" });
  }, [selected]);

  return (
    <Layout
      title="Photography World Map"
      description="A globe of every photography trip on this site. Pick a trip to see where the photos come from."
      url={url}
      image="/assets/blog/photography.png"
      imageAlt="a high quality rendering of an old film camera"
      keywords={[
        "photography map",
        "travel map",
        "photo locations",
        "world map",
        "travel photography",
      ]}
    >
      <main className="pt-5 pb-20 px-3 max-w-5xl mx-auto">
        <Header
          breadcrumbs={{ path: url }}
          title="Photography World Map"
          subtitle="Every trip, placed on a globe"
        />

        <article className="mx-auto max-w-prose">
          <p>
            This globe holds every photography trip on the site. Pick a trip to see the photos
            behind the pin.
          </p>
          <p>
            Most pins are placed by hand. The cameras I used before the Pixel 6 wrote no GPS, so{" "}
            {formatCount(totals.withGps)} of {formatCount(totals.photos)} photos carry real
            coordinates. The rest sit at a spot I chose for the trip.
          </p>
        </article>

        <section className="not-prose mt-10" aria-label="Photo trips on a globe">
          <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <PhotoGlobe
              trips={trips}
              selected={selected}
              onSelectTrip={handleSelect}
              className={GLOBE_BOX}
            />
          </div>

          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Drag to turn the globe. Pinch or scroll to zoom. On a phone, swipe up and down to scroll
            the page and sideways to turn the globe.
          </p>

          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex gap-1.5">
              <dt>Trips</dt>
              <dd className="m-0 font-semibold text-gray-900 dark:text-gray-100">
                {formatCount(totals.places)}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Photos</dt>
              <dd className="m-0 font-semibold text-gray-900 dark:text-gray-100">
                {formatCount(totals.photos)}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>With GPS</dt>
              <dd className="m-0 font-semibold text-gray-900 dark:text-gray-100">
                {formatCount(totals.withGps)}
              </dd>
            </div>
          </dl>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            The best-of gallery repeats photos from the other folders, so it has no pin and no count
            here.
          </p>
        </section>

        <section className="not-prose mt-10" aria-labelledby="world-regions">
          <h2
            id="world-regions"
            className="m-0 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            Regions
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-700 dark:text-gray-200">
            {LEGEND_REGIONS.map((region) => (
              <li key={region} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(${REGION_CSS_VARIABLES[region]})` }}
                />
                {region}
              </li>
            ))}
          </ul>
        </section>

        <section className="not-prose mt-8" aria-labelledby="world-trip-picker">
          <h2
            id="world-trip-picker"
            className="m-0 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
          >
            Pick a trip
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {placeTrips.map((trip) => (
              <li key={trip.name}>
                <button
                  type="button"
                  aria-pressed={selected === trip.name}
                  onClick={() => handleSelect(selected === trip.name ? null : trip.name)}
                  className={clsx(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    selected === trip.name
                      ? "border-accent text-accent"
                      : "border-gray-300 text-gray-700 hover:border-accent dark:border-gray-600 dark:text-gray-200",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(${REGION_CSS_VARIABLES[trip.region]})` }}
                  />
                  {trip.label}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section ref={panel} className="not-prose mt-10 scroll-mt-24" aria-live="polite">
          {selectedTrip ? (
            <TripDetail trip={selectedTrip} />
          ) : (
            <p className="text-base text-gray-500 dark:text-gray-400">
              Nothing picked yet. Choose a pin on the globe or a trip above.
            </p>
          )}
        </section>

        <p className="mt-12 text-base">
          <Link href="/photography">Back to all photography galleries</Link>
        </p>
      </main>
    </Layout>
  );
}

function positionSentence(trip: WorldTrip): string {
  if (trip.gpsCount === 0)
    return "No photo in this folder carries GPS, so I placed the pin by hand.";
  if (trip.source === "manual") {
    return `${formatCount(trip.gpsCount)} photos carry GPS, too few to trust, so I placed the pin by hand.`;
  }
  return `The pin sits on the average of ${formatCount(trip.gpsCount)} photos that carry GPS.`;
}

function TripDetail({ trip }: { trip: WorldTrip }) {
  const [cover, ...rest] = trip.thumbnails;

  return (
    <Card
      layout="horizontal"
      link={`/photography/${trip.name}`}
      title={trip.label}
      subtitle={trip.region}
      excerpt={trip.description || undefined}
      cover={
        cover
          ? { src: cover.src, alt: cover.alt, width: cover.width, height: cover.height }
          : { src: "/assets/blog/photography.png", alt: "an old film camera" }
      }
    >
      <p className="m-0 mt-3 text-base text-gray-600 dark:text-gray-300">
        {formatCount(trip.photoCount)} photos. {positionSentence(trip)}
      </p>

      {rest.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {rest.map((thumbnail) => (
            <span
              key={thumbnail.src}
              className="relative block aspect-square overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700"
            >
              <ImageWithLoader
                src={thumbnail.src}
                alt={thumbnail.alt}
                width={128}
                height={Math.max(1, Math.round(128 * (thumbnail.height / thumbnail.width)))}
                sizes="128px"
                className="h-full w-full object-cover"
              />
            </span>
          ))}
        </div>
      )}

      <p className="m-0 mt-4 text-base font-semibold text-accent">Open the {trip.label} gallery</p>
    </Card>
  );
}

/** Thumbnails to pull per trip: one cover plus a strip of three. */
const THUMBNAILS_PER_TRIP = 4;

export async function getStaticProps(): Promise<{ props: Props }> {
  const { getPhotoGeoData } = await import("src/lib/photoGeo");
  const { getLocalMetadata, photographyFolder } = await import("src/lib/imageMetadata");
  const { resolveAlt } = await import("src/lib/imageAlt");
  const { trips: curatedTrips } = await import("../photography");

  const metadata = getLocalMetadata();
  const descriptions = new Map(
    curatedTrips.map(({ name, description }) => [name, description ?? ""]),
  );

  // One pass over the 8,000-key metadata file instead of one per trip.
  const imagePattern = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
  const byTrip = new Map<string, Thumbnail[]>();
  for (const key of Object.keys(metadata)) {
    if (!key.startsWith(photographyFolder) || !imagePattern.test(key)) continue;
    const entry = metadata[key];
    if (!entry) continue;
    const tripName = key.slice(photographyFolder.length).split("/")[0];
    if (!tripName) continue;
    // `alt` is in the JSON for every photography key but missing from the exported type.
    const { alt } = entry as { alt?: string };
    const bucket = byTrip.get(tripName) ?? [];
    bucket.push({
      src: key,
      alt: resolveAlt(key, alt),
      width: entry.width,
      height: entry.height,
    });
    byTrip.set(tripName, bucket);
  }

  const geo = getPhotoGeoData();
  const trips: WorldTrip[] = geo.trips.map((trip) => {
    const all = byTrip.get(trip.name) ?? [];
    // Spread the picks across the folder so the strip is not four frames of one scene.
    const step = Math.max(1, Math.floor(all.length / THUMBNAILS_PER_TRIP));
    const thumbnails: Thumbnail[] = [];
    for (let i = 0; i < all.length && thumbnails.length < THUMBNAILS_PER_TRIP; i += step) {
      thumbnails.push(all[i]);
    }
    return { ...trip, description: descriptions.get(trip.name) ?? "", thumbnails };
  });

  const placeTrips = trips.filter((trip) => trip.kind !== "collection");
  const totals: Totals = {
    places: placeTrips.length,
    photos: placeTrips.reduce((sum, trip) => sum + trip.photoCount, 0),
    withGps: placeTrips.reduce((sum, trip) => sum + trip.gpsCount, 0),
  };

  return { props: { trips, totals } };
}

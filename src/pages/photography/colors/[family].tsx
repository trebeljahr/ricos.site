import { ColorWheel } from "@components/ColorWheel";
import { GalleryPage } from "@components/GalleryPage";
import Layout from "@components/Layout";
import Link from "next/link";
import type { ImageProps } from "src/@types";
import { COLOR_BUCKETS, type ColorBucketId, isColorBucketId } from "src/lib/colorBuckets.mjs";
import {
  colorBucketCounts,
  imagesForBucket,
  type PhotoColorCounts,
  tripsForBucket,
} from "src/lib/photographyColors";
import { formatCount } from "src/lib/utils/formatCount";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

/**
 * How many photos one family page puts on screen.
 *
 * Five of the twelve families are bigger than any gallery this site has ever
 * shipped: green 1,519, gold 1,426, brown 1,327, blue 1,185, orange 819. The
 * other seven are 491 and down and never hit this limit.
 *
 * 600 is the number because it is the size the gallery is already known to
 * carry. Measured on the green family in this worktree: 600 photos serialise
 * to 54,636 bytes of `__NEXT_DATA__` and 9,600 srcSet objects in
 * GalleryPage's memo, against 50,194 bytes and 9,152 objects for the 572-photo
 * best-of gallery that is live today. Uncapped green would be 154,245 bytes
 * and 27,632 objects — three times the largest page ever measured here, all of
 * it shipped to a phone before the first tile appears, for photos that carry
 * a green strength of 0.25 and below.
 *
 * What the cut actually drops: the 600th green photo still covers a quarter of
 * its frame in green (strength 0.250), and the top 600 hold 65.9% of all the
 * green in the family. Blue cuts at 0.201 (73.7% of its blue), gold at 0.137
 * (70.2%), brown at 0.093 (66.4%), orange at 0.044 (89.7%). So the cap removes
 * the long accent tail and keeps the part of each family a person came for.
 *
 * The page says the number out loud whenever it applies, and links to the trip
 * galleries, which are uncapped and hold every photo. A stated cap is a fact a
 * reader can act on; a silent one is a page that lies about its own totals.
 */
const PAGE_LIMIT = 600;

/**
 * How many trips the "where it comes from" row names.
 *
 * Every big family spans all 28 trips, and even pink and purple span 25 — a
 * full row would be four lines of links, most of them reading "Varanasi 1".
 * Measured across the twelve families, the top twelve trips carry between 71%
 * and 98% of a family's photos, so twelve rows answer "where does this colour
 * come from" and the tail only answers "where does it also occur once".
 */
const TRIP_ROW_LIMIT = 12;

type TripCount = { trip: string; count: number };

type Props = {
  family: ColorBucketId;
  /** Up to PAGE_LIMIT photos, the ones carrying most of this colour first. */
  images: ImageProps[];
  /** Photos in the whole family, which is what the wheel's centre shows. */
  total: number;
  counts: PhotoColorCounts;
  trips: TripCount[];
  /** Trips carrying this family at all, so the row can own up to what it hides. */
  tripTotal: number;
};

/** The trips row: "South India 163 · Rajasthan 138 · …", each linking to that
 *  gallery. This is the axis a painting archive does not have — blue in
 *  Indonesia is water, blue in Himachal Pradesh is altitude — so it is worth
 *  a line of its own rather than being left implicit in the photos. */
function TripRow({ trips, tripTotal }: { trips: TripCount[]; tripTotal: number }) {
  const hidden = tripTotal - trips.length;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="m-0! text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Where it comes from
      </h2>
      <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-sm">
        {trips.map(({ trip, count }) => (
          <li key={trip} className="m-0">
            <Link
              href={`/photography/${trip}`}
              // Pages Router prefetches every in-viewport link. Twelve trip
              // galleries is twelve multi-hundred-photo JSON payloads pulled
              // down for a row nobody has clicked yet, so these opt out and
              // fetch on hover instead.
              prefetch={false}
              className="text-gray-700 hover:text-accent dark:text-gray-300"
            >
              {turnKebabIntoTitleCase(trip)}{" "}
              <span className="text-gray-500 tabular-nums dark:text-gray-400">{count}</span>
            </Link>
          </li>
        ))}
        {hidden > 0 && (
          <li className="m-0">
            <Link
              href="/photography"
              prefetch={false}
              className="text-gray-500 hover:text-accent dark:text-gray-400"
            >
              +{hidden} more {hidden === 1 ? "trip" : "trips"}
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}

export default function PhotographyColorFamilyPage({
  family,
  images,
  total,
  counts,
  trips,
  tripTotal,
}: Props) {
  // `family` came through isColorBucketId, so the bucket exists. COLOR_BUCKETS
  // is imported rather than passed through props because colorBuckets.mjs is
  // pure arithmetic and constants — ColorWheel already ships it to the client.
  const bucket = COLOR_BUCKETS.find(({ id }) => id === family);
  const label = bucket?.label ?? turnKebabIntoTitleCase(family);
  const swatch = bucket?.swatch ?? "#888888";
  const colourWord = label.toLowerCase();
  const capped = total > images.length;
  const hero = images[0];

  return (
    <Layout
      title={`${label} Photography – Rico Trebeljahr`}
      description={`${formatCount(total)} travel photos that read as ${colourWord}, the ones carrying most of it first. Part of browsing Rico Trebeljahr's photography by colour.`}
      url={`/photography/colors/${family}`}
      image={hero?.src}
      imageAlt={`The most ${colourWord} photo in Rico Trebeljahr's travel photography`}
      imageWidth={hero?.width}
      imageHeight={hero?.height}
      keywords={[
        "photography",
        "colour",
        "color",
        colourWord,
        family,
        "gallery",
        "photos",
        "travel photography",
      ]}
      fullScreen={true}
    >
      <GalleryPage
        path={`photography/colors/${family}`}
        title={label}
        images={images}
        intro={
          <div className="mb-10 flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
            <div className="flex flex-1 flex-col gap-5">
              <p className="m-0! flex items-baseline gap-2 text-lg">
                <span
                  aria-hidden
                  className="size-4 shrink-0 translate-y-0.5 rounded-full ring-1 ring-black/15 ring-inset"
                  style={{ backgroundColor: swatch }}
                />
                <span>
                  {formatCount(total)} photos carry {colourWord}.
                  {capped && ` This page shows the ${images.length} that carry the most.`}
                </span>
              </p>
              {/* Both sentences are here because the order is not obvious and
                  is the whole reason the page opens the way it does: a photo
                  joins a family on a low bar, so an unordered page would open
                  on accents. */}
              <p className="m-0! text-base text-gray-600 dark:text-gray-300">
                A photo counts when it carries the colour anywhere in the frame, so the fullest are
                first and the accents are last.{" "}
                {capped && (
                  <>
                    The rest are in the{" "}
                    <Link href="/photography" prefetch={false} className="hover:text-accent">
                      trip galleries
                    </Link>
                    , which hold every photo.
                  </>
                )}
              </p>
              <TripRow trips={trips} tripTotal={tripTotal} />
              <p className="m-0! text-sm">
                <Link href="/photography/colors" className="hover:text-accent">
                  All twelve colour families
                </Link>
              </p>
            </div>
            {/* Legend off: the heading above already names this family, and the
                twelve legend rows would repeat the navigation the wheel is. The
                width is held down because at its own 352px the wheel outweighs
                the text beside it and pushes the first row of photos off a
                laptop screen. */}
            <ColorWheel
              counts={counts}
              active={family}
              showLegend={false}
              className="w-full max-w-[224px] shrink-0 self-center md:self-start"
            />
          </div>
        }
      />
    </Layout>
  );
}

export async function getStaticPaths() {
  // The twelve families are a fixed list in colorBuckets.mjs, not something
  // derived from the baked JSON: a family that happens to be empty still needs
  // a page, because the wheel links to all twelve from every other page.
  return {
    paths: COLOR_BUCKETS.map(({ id }) => ({ params: { family: id } })),
    fallback: false,
  };
}

type StaticProps = { params: { family: string } };

export async function getStaticProps({
  params,
}: StaticProps): Promise<{ props: Props } | { notFound: true }> {
  const { family } = params;
  if (!isColorBucketId(family)) return { notFound: true };

  const all = imagesForBucket(family);
  const tripRows = tripsForBucket(family);

  return {
    props: {
      family,
      images: all.slice(0, PAGE_LIMIT),
      total: all.length,
      counts: colorBucketCounts(),
      trips: tripRows.slice(0, TRIP_ROW_LIMIT),
      tripTotal: tripRows.length,
    },
  };
}

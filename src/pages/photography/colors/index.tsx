import { Card } from "@components/Card";
import { ColorWheel } from "@components/ColorWheel";
import { ImageWithLoader } from "@components/ImageWithLoader";
import Layout from "@components/Layout";
import Header from "@components/PostHeader";
import { ToTopButton } from "@components/ToTopButton";
import Link from "next/link";
import type { ImageProps } from "src/@types";
import { COLOR_BUCKETS, type ColorBucketId } from "src/lib/colorBuckets.mjs";
import { getSeoInfo, type SeoInfo } from "src/lib/getSeoInfo";
import { getLocalMetadata } from "src/lib/imageMetadata";
import {
  colorBucketCounts,
  imagesBySpectrum,
  imagesForBucket,
  type PhotoColorCounts,
} from "src/lib/photographyColors";
import { formatCount } from "src/lib/utils/formatCount";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

/**
 * /photography/colors — the chooser for the twelve colour families.
 *
 * Everything on this page is a way into /photography/colors/<family>. The
 * wheel is the compact chooser, the card grid under it is the same twelve
 * links with evidence attached: four real photographs per family, so a
 * reader can tell what "Earth" or "Teal" means here before clicking into
 * 1,327 or 140 photos of it.
 *
 * WHY THE PREVIEWS ARE THE *STRONGEST* FOUR AND NOT A RANDOM FOUR
 * ---------------------------------------------------------------
 * `imagesForBucket` returns the family ordered by strength — the
 * chroma-weighted share of the whole frame that family occupies — so its
 * head is the four photos that carry most of that colour. A random sample
 * would be more representative of the family and much worse as a label: the
 * median member of Green is a landscape with some foliage in it, which
 * looks like the median member of Gold and of Earth. The extremes are what
 * separate one swatch from the next.
 *
 * WHY THIS PAGE STATES THE MEMBERSHIP ARITHMETIC OUT LOUD
 * ------------------------------------------------------
 * The twelve counts on the wheel sum to 7,402 across an archive of 4,359
 * photos, and a reader who adds them up and finds 1.7x too many will assume
 * the page is broken. Membership is genuinely multi-family — measured over
 * all 4,359: 1,971 photos list one family, 1,751 list two and 637 list
 * three or more — so the intro says so in numbers rather than leaving the
 * mismatch to be discovered.
 *
 * WHY THE NUMBERS IN THE COPY ARE COMPUTED HERE AND NOT WRITTEN OUT
 * ----------------------------------------------------------------
 * The membership split is derived in `getStaticProps` from the same lib the
 * counts come from, not typed into the sentence. A re-bake after new photos
 * land moves every one of those figures, and a page that talks about "1,971
 * photos" while the wheel behind it has already moved on is worse than a
 * page with no numbers at all.
 */

type FamilyPreview = {
  id: ColorBucketId;
  label: string;
  swatch: string;
  count: number;
  /** Strongest photo in the family, with a real description. */
  cover: { src: string; alt: string; width: number; height: number };
  /** Photos two to four, shown as decorative thumbnails. */
  strip: ImageProps[];
};

type MembershipSplit = {
  /** Live, classified photos — the denominator for everything else here. */
  total: number;
  inOne: number;
  inTwo: number;
  inThreeOrMore: number;
  /** Photos with no hue at all, which sit only in a neutral band. */
  neutralOnly: number;
};

type Props = {
  families: FamilyPreview[];
  counts: PhotoColorCounts;
  membership: MembershipSplit;
  seo: SeoInfo | null;
};

// The card grid is `grid-cols-1 gap-6 sm:grid-cols-2` inside `max-w-5xl px-3`,
// so a card is `100vw - 24px` on one column and `50vw - 24px` on two, capped
// at (1000 - 24) / 2 = 488px once the container stops growing at 1024px.
const COVER_SIZES =
  "(max-width: 639px) calc(100vw - 24px), (max-width: 1023px) calc(50vw - 24px), 488px";

// Three thumbnails with `gap-2` inside the card body's `p-5 md:p-6`, so a
// thumbnail is (card - 2 * padding - 16) / 3, which lands on 141px at desktop.
// The md padding step from 20px to 24px is left out of the middle branch: it
// moves the answer by 2.7px, and a fourth branch costs more to read than the
// rounding costs to fetch. At 141px `next/image` picks the 256 variant at 1x
// and 384 at 2x, so the twelve previews cost 48 thumbnails, not 48 originals.
const STRIP_SIZES =
  "(max-width: 639px) calc((100vw - 80px) / 3), (max-width: 1023px) calc((50vw - 88px) / 3), 141px";

function FamilyCard({ family }: { family: FamilyPreview }) {
  return (
    <Card
      link={`/photography/colors/${family.id}`}
      title={family.label}
      headingAs="h3"
      cover={family.cover}
      sizes={COVER_SIZES}
      // The family pages carry every photo in the family as props — up to
      // 1,519 of them for Green. Next prefetches links in the viewport by
      // default, so leaving this on would pull all twelve payloads the moment
      // the grid scrolls into view, for a reader who will open one of them.
      prefetch={false}
    >
      <p className="m-0 mt-4 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
        <span
          aria-hidden
          className="size-3.5 shrink-0 rounded-full ring-1 ring-black/15 ring-inset"
          style={{ backgroundColor: family.swatch }}
        />
        {formatCount(family.count)} {family.count === 1 ? "photo" : "photos"}
      </p>
      <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {family.strip.map((photo) => (
          <li
            key={photo.src}
            className="relative aspect-square overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700"
          >
            {/* alt="" on purpose. The whole card is one anchor, so every alt
                inside it joins that link's accessible name; the cover already
                contributes one full sentence of description, and three more
                would read out four photo descriptions to reach one link
                labelled "Green". These three are samples of the cover, not
                separate information. */}
            <ImageWithLoader
              src={photo.src}
              alt=""
              width={photo.width}
              height={photo.height}
              sizes={STRIP_SIZES}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function PhotographyColorsPage({ families, counts, membership, seo }: Props) {
  const url = "photography/colors";

  return (
    <Layout
      title={seo?.metaTitle || "Photography by Colour"}
      description={
        seo?.metaDescription ||
        "Browse Rico Trebeljahr's travel photography by colour. Twelve colour families measured from the pixels of every photo, plus a continuous hue-sorted spectrum."
      }
      url={url}
      image={seo?.ogImage || "/assets/blog/photography.png"}
      imageAlt={seo?.ogImageAlt || "a high quality rendering of an old film camera"}
      keywords={
        seo?.keywords || [
          "photography",
          "colour",
          "color",
          "gallery",
          "photos",
          "hue",
          "palette",
          ...families.map((family) => family.label.toLowerCase()),
        ]
      }
    >
      <main className="pt-5 pb-20 px-3 max-w-5xl mx-auto">
        <Header
          breadcrumbs={{ path: url }}
          title="Photography by Colour"
          subtitle="Twelve colour families, read straight from the pixels of every photo"
        />

        <ColorWheel counts={counts} className="mb-12" />

        <section className="mb-16 max-w-2xl">
          <p className="mt-0 mb-4 text-base leading-relaxed text-gray-600 md:text-lg dark:text-gray-300">
            I did not tag any of this by hand. A script reads the pixels of every photo and works
            out which colour families the frame is actually made of.
          </p>
          <p className="mt-0 mb-4 text-base leading-relaxed text-gray-600 md:text-lg dark:text-gray-300">
            Most photos land in more than one. Of {formatCount(membership.total)} photos,{" "}
            {formatCount(membership.inOne)} sit in a single family, {formatCount(membership.inTwo)}{" "}
            in two and {formatCount(membership.inThreeOrMore)} in three or more. So the twelve
            counts above add up to more than the archive holds, and the same frame can turn up under
            Green and under Gold. {formatCount(membership.neutralOnly)} photos carry no usable hue
            at all — night, fog, whiteout snow — and appear only under White, Grey or Black.
          </p>
          <p className="mt-0 mb-0 text-base leading-relaxed text-gray-600 md:text-lg dark:text-gray-300">
            <Link href="/photography/spectrum" className="text-accent hover:underline">
              The spectrum
            </Link>{" "}
            takes the other route. It drops the families and puts every photo in the collection in
            one continuous sweep, ordered by hue.
          </p>
        </section>

        <section aria-labelledby="families-heading">
          <h2 id="families-heading" className="sr-only">
            The colour families
          </h2>
          <div className="not-prose grid grid-cols-1 gap-6 sm:grid-cols-2">
            {families.map((family) => (
              <FamilyCard key={family.id} family={family} />
            ))}
          </div>
        </section>

        <ToTopButton />
      </main>
    </Layout>
  );
}

/** How many photos one card previews: one as the cover, three as thumbnails
 *  under the label. Four is what fits a 3-up strip plus a cover without a
 *  ragged last row. */
const PREVIEW_LENGTH = 4;

/** The four strongest photos in a family, at most one per filename.
 *
 *  The filename guard is belt-and-braces. `keys()` in src/lib/photographyColors.ts
 *  already drops the second copy of every photo filed under both a trip and
 *  best-of, so nothing reaching here should repeat — this page was where that
 *  duplication was first noticed, as one photograph appearing as both the
 *  cover and the first thumbnail of Green, and the fix went into the lib
 *  because the family galleries and the spectrum had it too.
 *
 *  Kept anyway, for the cost of a Set over four items: on a page whose whole
 *  job is to show what a swatch means, a family illustrated by one photo
 *  printed twice is the worst possible answer, and this is the last place
 *  that would notice if the lib's rule ever stopped covering a case.
 *
 *  It deliberately does not catch near-duplicates that differ genuinely:
 *  Earth's head holds "DSC09147-2" and "DSC09147", two edits of one frame,
 *  and Gold's holds four consecutive frames of one burst. Both are distinct
 *  photographs, and guessing which distinct photographs are too similar from
 *  their names is how a picker starts throwing away good ones.
 *
 *  Every family has at least 29 members, so the previews never come out
 *  short. */
function pickPreview(images: ImageProps[]): ImageProps[] {
  const seen = new Set<string>();
  const picked: ImageProps[] = [];
  for (const image of images) {
    const filename = image.src.split("/").pop() ?? image.src;
    if (seen.has(filename)) continue;
    seen.add(filename);
    picked.push(image);
    if (picked.length === PREVIEW_LENGTH) break;
  }
  return picked;
}

/** Alt text for one preview cover.
 *
 *  metadata.json carries a written description for nearly every photograph
 *  (mostly generated, see src/scripts/syncImageAltMetadata.ts), but it is not
 *  part of `ImageMetadata` and not part of `ImageProps`, so the colour lib
 *  cannot hand it over. Reading it here is cheap: this runs at build time and
 *  only twelve photos on this page need a description at all.
 *
 *  The fallback names the trip instead of the file, because the filename is a
 *  camera serial ("DSC04727") and "DSC04727" is not a description of anything. */
function coverAlt(src: string, label: string): string {
  const meta = getLocalMetadata()[src] as { alt?: string } | undefined;
  const written = meta?.alt?.trim();
  if (written) return written;
  const trip = src.split("/")[2];
  return trip
    ? `A ${label.toLowerCase()} photo from ${turnKebabIntoTitleCase(trip)}`
    : `A ${label.toLowerCase()} photo`;
}

export async function getStaticProps(): Promise<{ props: Props }> {
  const counts = colorBucketCounts();

  const families = COLOR_BUCKETS.flatMap<FamilyPreview>((bucket) => {
    // Every family currently holds between 29 (White) and 1,519 (Green)
    // photos, so this never drops one. It is here because the wheel can show
    // an empty family as a count of zero and a card cannot: `Card` needs a
    // cover image, and a re-bake after a big deletion could empty a small
    // band. Dropping the card while the wheel keeps the swatch is the honest
    // failure — the family still exists, it just has nothing to show.
    const [cover, ...rest] = pickPreview(imagesForBucket(bucket.id));
    if (!cover) return [];
    return [
      {
        id: bucket.id,
        label: bucket.label,
        swatch: bucket.swatch,
        count: counts[bucket.id] ?? 0,
        cover: { ...cover, alt: coverAlt(cover.src, bucket.label) },
        strip: rest,
      },
    ];
  });

  // The membership histogram, built from the twelve family lists rather than
  // from the baked JSON directly. `photographyColors.ts` is the only runtime
  // reader of that file by contract, and it exports memberships per family but
  // not per photo — so counting how many families each photo appears in means
  // inverting the twelve lists. That is ~8,300 map writes at build time, once.
  const familiesPerPhoto = new Map<string, number>();
  for (const bucket of COLOR_BUCKETS) {
    for (const image of imagesForBucket(bucket.id)) {
      familiesPerPhoto.set(image.src, (familiesPerPhoto.get(image.src) ?? 0) + 1);
    }
  }

  // Photos that list only White, Grey or Black. Measured over the current
  // bake these are exactly the 154 photos whose hue is null, which is the
  // definition working as intended: a frame with no measurable hue can only
  // land in a neutral band.
  const chromaticFamilies = COLOR_BUCKETS.filter((bucket) => !bucket.neutral);
  const withHue = new Set(
    chromaticFamilies.flatMap((bucket) => imagesForBucket(bucket.id).map((image) => image.src)),
  );

  // `imagesBySpectrum()` is every live classified photo in one array, which makes it
  // the total. Deriving it from the lib rather than from `Object.keys` of the
  // JSON keeps it equal to what the family pages behind these cards will show:
  // the lib drops rows whose photo has left metadata.json since the last bake.
  const allPhotos = imagesBySpectrum();

  let inOne = 0;
  let inTwo = 0;
  let inThreeOrMore = 0;
  for (const count of familiesPerPhoto.values()) {
    if (count === 1) inOne += 1;
    else if (count === 2) inTwo += 1;
    else inThreeOrMore += 1;
  }

  return {
    props: {
      families,
      counts,
      membership: {
        total: allPhotos.length,
        inOne,
        inTwo,
        inThreeOrMore,
        neutralOnly: allPhotos.filter((image) => !withHue.has(image.src)).length,
      },
      seo: getSeoInfo("/photography/colors"),
    },
  };
}

import { GalleryPage } from "@components/GalleryPage";
import Layout from "@components/Layout";
import type { ImageProps } from "src/@types";
import { COLOR_BUCKETS, type ColorBucketId, isColorBucketId } from "src/lib/colorBuckets.mjs";
import { imagesForBucket } from "src/lib/photographyColors";
import { formatCount } from "src/lib/utils/formatCount";
import { turnKebabIntoTitleCase } from "src/lib/utils/turnKebapIntoTitleCase";

/**
 * How many photos one family page puts on screen.
 *
 * Four of the eleven families are bigger than any gallery this site has ever
 * shipped: gold 1,549, green 1,520, blue 1,183, orange 986. The other seven
 * are 491 and down and never hit this limit.
 *
 * 600 is the number because it is the size the gallery is already known to
 * carry. Measured on the green family in this worktree: 600 photos serialise
 * to 54,636 bytes of `__NEXT_DATA__` and 9,600 srcSet objects in
 * GalleryPage's memo, against 50,194 bytes and 9,152 objects for the 572-photo
 * best-of gallery that is live today. Uncapped green would be 154,245 bytes
 * and 27,632 objects — three times the largest page ever measured here, all of
 * it shipped to a phone before the first tile appears, for photos that carry
 * a green strength of 0.22 and below.
 *
 * What the cut actually drops: the 600th green photo still covers about a
 * fifth of its frame in green (strength 0.223), and the top 600 hold 70.9% of
 * all the green in the family. Gold cuts at 0.193 (67.8% of its gold), blue at
 * 0.178 (78.8%), orange at 0.069 (86.7%). So the cap removes the long accent
 * tail and keeps the part of each family a person came for.
 *
 * THE CAP IS NOT STATED ON THE PAGE, AND THAT IS A DELIBERATE TRADE
 * -----------------------------------------------------------------
 * It used to be: the page opened with "986 photos carry orange, this page
 * shows the 600 that carry the most", a line about how membership works and a
 * row of the trips the colour came from. All of it was cut as chrome standing
 * between the reader and the photographs, which is what they came for.
 *
 * So the page now shows 600 of a larger family without saying so. What makes
 * that acceptable rather than a lie is that nothing on the page claims a
 * total: there is no count in the heading and no "showing X of Y", so there is
 * no number for the gallery to contradict. `total` survives only in the meta
 * description, which is honest about the family's real size.
 *
 * It is still a real trade. Someone scrolling the orange page reaches the end
 * at 600 and has no way to learn that 386 fainter orange photos exist. If that
 * matters more than the clean page does, the fix is not to reinstate the
 * paragraph — it is to let the gallery keep paginating past PAGE_LIMIT.
 */
const PAGE_LIMIT = 600;

type Props = {
  family: ColorBucketId;
  /** Up to PAGE_LIMIT photos, the ones carrying most of this colour first. */
  images: ImageProps[];
  /** Photos in the whole family, used for the page description. */
  total: number;
};

export default function PhotographyColorFamilyPage({ family, images, total }: Props) {
  // `family` came through isColorBucketId, so the bucket exists. COLOR_BUCKETS
  // is imported rather than passed through props because colorBuckets.mjs is
  // pure arithmetic and constants, so it costs less than serialising the label
  // into every page's props would.
  const bucket = COLOR_BUCKETS.find(({ id }) => id === family);
  const label = bucket?.label ?? turnKebabIntoTitleCase(family);
  const colourWord = label.toLowerCase();
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
      <GalleryPage path={`photography/colors/${family}`} title={label} images={images} />
    </Layout>
  );
}

export async function getStaticPaths() {
  // The eleven families are a fixed list in colorBuckets.mjs, not something
  // derived from the baked JSON: a family that happens to be empty still needs
  // a page, because the wheel links to all eleven from every other page.
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

  return {
    props: {
      family,
      images: all.slice(0, PAGE_LIMIT),
      total: all.length,
    },
  };
}

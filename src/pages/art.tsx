import { GalleryPage } from "@components/GalleryPage";
import Layout from "@components/Layout";
import type { ImageProps } from "src/@types";
import { getDataFromMetadata } from "src/lib/imageMetadata";

export default function ArtGallery({ images }: { images: ImageProps[] }) {
  const cover = images[0];

  return (
    <Layout
      title="Art – Rico Trebeljahr"
      description={`${images.length} paintings and drawings by Rico Trebeljahr: acrylic, watercolour, ink and pencil, newest first.`}
      url="/art"
      image={cover?.src}
      imageAlt={cover?.alt || "A painting by Rico Trebeljahr"}
      imageWidth={cover?.width}
      imageHeight={cover?.height}
      keywords={["art", "paintings", "drawings", "acrylic", "watercolour", "sketches"]}
      fullScreen={true}
    >
      <GalleryPage path="art" title="Art" images={images} />
    </Layout>
  );
}

/** Sort key from the phone camera's filename: PXL_20260518_070236623,
 *  IMG-20240423-WA0003 (WhatsApp, date only) or image_20260426223637. */
function photoTakenAt(name: string) {
  const match = name.match(/(?:PXL_|IMG-|image_)(20\d{6})[_-]?(\d{6})?/);
  return match ? match[1] + (match[2] ?? "000000") : "";
}

export async function getStaticProps() {
  const images = getDataFromMetadata("assets/art/").sort((a, b) =>
    photoTakenAt(b.name).localeCompare(photoTakenAt(a.name)),
  );

  return { props: { images } };
}

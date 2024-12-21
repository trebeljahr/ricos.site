import Layout from "@components/Layout";
import { NiceGallery } from "@components/NiceGallery";
import { ToTopButton } from "@components/ToTopButton";
import { ImageProps } from "src/@types";
import { getDataFromS3 } from "src/lib/aws";
import { transformToImageProps } from "src/lib/mapToImageProps";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

export default function MidjourneyGallery({
  images,
}: {
  images: ImageProps[];
}) {
  return (
    <Layout
      title="Midjourney Images"
      description="A page with all my AI generated art."
      url={`/midjourney`}
      fullScreen={true}
    >
      <div className="mb-20 px-3">
        <h1 style={{ marginTop: "-2rem", marginBottom: "1.2rem" }}>
          Midjourney Images
        </h1>
        <NiceGallery images={images} />

        <ToTopButton />
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const prefix = "assets/midjourney-gallery/";
  const awsImageData = await getDataFromS3({ prefix });
  const images: ImageProps[] = awsImageData.map(transformToImageProps);

  return { props: { images } };
}

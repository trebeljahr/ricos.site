import Layout from "@components/Layout";
import { InfiniteScrollGallery } from "@components/Galleries";
import { ToTopButton } from "@components/ToTopButton";
import { ImageProps } from "src/@types";
import { getDataFromS3 } from "src/lib/aws";

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
        <InfiniteScrollGallery images={images} />

        <ToTopButton />
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const prefix = "assets/midjourney-gallery/";
  const awsImageData = await getDataFromS3({ prefix });

  return { props: { images: awsImageData } };
}

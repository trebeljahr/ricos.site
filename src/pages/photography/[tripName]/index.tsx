import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import Modal from "src/components/image-gallery/Modal";
import { getS3Folders, getS3ImageData } from "src/lib/aws";
import { ImageProps } from "src/utils/types";
import { useLastViewedPhoto } from "src/utils/useLastViewedPhoto";
import Layout from "../../../components/layout";

export default function ImageGallery({
  images,
  tripName,
}: {
  images: ImageProps[];
  tripName: string;
}) {
  const router = useRouter();
  const { photoId: photoIdFromQuery } = router.query;

  const photoIdNumber = parseInt(photoIdFromQuery as string);
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();

  const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (lastViewedPhoto && !photoIdNumber) {
      lastViewedPhotoRef?.current?.scrollIntoView({ block: "center" });
      setLastViewedPhoto(0);
    }
  }, [photoIdNumber, lastViewedPhoto, setLastViewedPhoto]);

  return (
    <Layout
      title="Photography"
      description="A page with all my photography."
      url={`/photography/${tripName}`}
    >
      {photoIdNumber && (
        <Modal
          images={images}
          onClose={() => {
            setLastViewedPhoto(photoIdNumber);
          }}
        />
      )}
      {images.map(({ index: id, url }) => (
        <Link
          key={id}
          href={`${tripName}/${id}`}
          as={`${tripName}/${id}`}
          ref={id === Number(lastViewedPhoto) ? lastViewedPhotoRef : null}
          shallow
          className="after:content group relative mb-5 block w-full cursor-zoom-in after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight"
        >
          <Image
            alt="Next.js Conf photo"
            className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110"
            style={{ transform: "translate3d(0, 0, 0)" }}
            // placeholder="blur"
            // blurDataURL={blurDataUrl}
            src={url}
            width={720}
            height={480}
            sizes="(max-width: 640px) 100vw,
                  (max-width: 1280px) 50vw,
                  (max-width: 1536px) 33vw,
                  25vw"
          />
        </Link>
      ))}
    </Layout>
  );
}

type StaticProps = {
  params: { tripName: string };
};

export async function getStaticPaths() {
  const tripNames = await getS3Folders();

  return {
    paths: tripNames.map((tripName) => {
      return { params: { tripName } };
    }),
    fallback: false,
  };
}

export async function getStaticProps({ params }: StaticProps) {
  console.log("from tripName", { params });

  const imageFileNames = await getS3ImageData({
    prefix: params.tripName,
  });

  const images: ImageProps[] = imageFileNames.map((name, index) => {
    return {
      tripName: params.tripName,
      index,
      name,
      url: `https://${process.env.NEXT_PUBLIC_STATIC_FILE_URL}/photography/${name}`,
    };
  });

  console.log({ images });

  return { props: { images, tripName: params.tripName } };
}

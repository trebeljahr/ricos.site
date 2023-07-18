import { ImageDataFromAWS, bucketPrefix } from "./aws";

const imageSizes = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
];

function nextImageUrl(src: string, size: number) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${size}&q=75`;
}

export async function mapToImageProps(
  images: ImageDataFromAWS[],
  tripName: string
) {
  return await Promise.all(
    images.map(async ({ name, width, height }, index) => {
      const src = `https://${process.env.NEXT_PUBLIC_STATIC_FILE_URL}/${bucketPrefix}${name}`;
      const image = {
        width,
        height,
        index,
        tripName,
        name,
        src,
        srcSet: imageSizes
          .filter((size) => size <= width)
          .map((size) => {
            const aspectRatio = Math.round(height / width);
            return {
              src: nextImageUrl(src, size),
              width: size,
              height: aspectRatio * size,
            };
          }),
      };

      return image;
    })
  );
}

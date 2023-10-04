import { ImageDataFromAWS, bucketPrefix } from "./aws";

const imageSizes = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840, 4000, 6000,
];

function nextImageUrl(src: string, width: number) {
  return `https://d2mpovkbhuoejh.cloudfront.net${src}?format=auto&width=${width}`;
}

export async function mapToImageProps(
  images: ImageDataFromAWS[],
  tripName: string
) {
  return await Promise.all(
    images.map(async ({ name, width, height }, index) => {
      const src = `/${bucketPrefix}${name}`;
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

import { ImageDataFromAWS } from "./aws";

export const imageSizes = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
];

function nextImageUrl(src: string, width: number) {
  return `https://d2mpovkbhuoejh.cloudfront.net${src}?format=auto&width=${width}`;
}

export function mapToImageProps(images: ImageDataFromAWS[], prefix: string) {
  return images.map(({ name, width, height }, index) => {
    const src = `/${prefix}${name}`;
    return {
      width,
      height,
      index,
      name,
      src,
      srcSet: imageSizes.map((size) => {
        const aspectRatio = Math.round(height / width);
        return {
          src: nextImageUrl(src, size),
          width: size,
          height: aspectRatio * size,
        };
      }),
    };
  });
}

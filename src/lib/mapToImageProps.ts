import path from "path";
import { ImageDataFromAWS } from "./aws";

export const imageSizes = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
];

export const cloudFrontUrl = `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net`;

console.log(cloudFrontUrl);

export const nextImageUrl = (src: string, width: number) => {
  if (!imageSizes.includes(width)) {
    throw new Error(`Invalid width for image ${src}: ${width}`);
  }

  console.log(cloudFrontUrl);

  const parsedPath = path.parse(src);
  const noExt = path.join(parsedPath.dir, parsedPath.name);
  const fixedSource = noExt.startsWith("/") ? noExt : `/${noExt}`;

  if (src.startsWith(cloudFrontUrl)) {
    return `${noExt}/${width}.webp`;
  }

  if (src.startsWith("http")) {
    return src;
  }

  return `${cloudFrontUrl}${fixedSource}/${width}.webp`;
};

export function mapToImageProps(images: ImageDataFromAWS[], prefix: string) {
  return images.map(({ name, width, height }, index) => {
    const src = encodeURI(`/${prefix}${name}`);
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

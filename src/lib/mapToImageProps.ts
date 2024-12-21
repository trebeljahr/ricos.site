import path from "path";
import { type ImageDataFromAWS } from "./aws";
import { ImageProps } from "src/@types";
import { nanoid } from "nanoid";

export const imageSizes = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
];

export const cloudFrontUrl = `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net`;

export const getImgWidthAndHeight = (src: string) => {
  const img = new Image();
  img.src = nextImageUrl(src, 3840);

  const imgPromise: Promise<{ width: number; height: number }> = new Promise(
    (resolve, reject) => {
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
        });
      };

      img.onerror = (error) => {
        console.error("Error loading image:", error);
        reject(error);
      };
    }
  );

  return imgPromise;
};

export const nextImageUrl = (src: string, width: number) => {
  if (!imageSizes.includes(width)) {
    throw new Error(`Invalid width for image ${src}: ${width}`);
  }

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

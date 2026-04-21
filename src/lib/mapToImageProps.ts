import path from "path";

export const imageSizes = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048,
  3840,
];

// In local-dev mode, images are served from the in-process /api/img route
// (which reads from local MinIO, transforms via sharp, caches to the local
// resized bucket). In prod/cloud mode, they come from CloudFront.
//
// Both end up producing URLs of the same shape:
//   <base>/<key-without-ext>/<width>.webp
// so no consumer of this module needs to care.
const IS_LOCAL_BACKEND =
  process.env.NEXT_PUBLIC_IMAGE_BACKEND === "local";

export const cloudFrontUrl = IS_LOCAL_BACKEND
  ? ""
  : `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net`;

/** Prefix that `nextImageUrl` prepends to logical image paths. */
export const imageBaseUrl = IS_LOCAL_BACKEND
  ? "/api/img"
  : cloudFrontUrl;

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

  if (cloudFrontUrl && src.startsWith(cloudFrontUrl)) {
    return `${noExt}/${width}.webp`;
  }

  if (src.startsWith("http")) {
    return src;
  }

  return `${imageBaseUrl}${fixedSource}/${width}.webp`;
};

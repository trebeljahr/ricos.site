import path from "node:path";

export const imageSizes = [
  16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
];

// In local-dev mode, images are served from the in-process /api/local-image route
// (which reads from the local S3 mock, transforms via sharp, caches to the local
// resized bucket). In prod/cloud mode, they come from CloudFront.
const CLOUDFRONT_ID = process.env.NEXT_PUBLIC_CLOUDFRONT_ID;
const IS_LOCAL_BACKEND = process.env.NEXT_PUBLIC_IMAGE_BACKEND === "local" || !CLOUDFRONT_ID;

export const cloudFrontUrl = IS_LOCAL_BACKEND ? "" : `https://${CLOUDFRONT_ID}.cloudfront.net`;

/** Prefix that `nextImageUrl` prepends to logical image paths. */
export const imageBaseUrl = IS_LOCAL_BACKEND ? "/api/local-image" : cloudFrontUrl;

export const getImgWidthAndHeight = (src: string) => {
  const img = new Image();
  img.src = nextImageUrl(src, 3840);

  const imgPromise: Promise<{ width: number; height: number }> = new Promise((resolve, reject) => {
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
  });

  return imgPromise;
};

export const nextImageUrl = (src: string, width: number) => {
  if (!imageSizes.includes(width)) {
    throw new Error(`Invalid width for image ${src}: ${width}`);
  }

  // Empty/missing src: return empty so callers can short-circuit (e.g. OpenGraph
  // uses `{imageUrl && <meta…>}`). Without this, path.join("","") returns "."
  // and we'd generate bogus "./<width>.webp" slugs that 400 in dev.
  if (!src) return "";

  // Pass-through paths that aren't under /assets/. These are static files
  // served directly from /public (e.g. /favicon/*), not pipeline-transformed
  // images. Routing them through /api/local-image would 404 because the mock only
  // exposes the Obsidian assets tree.
  if (!src.startsWith("http") && !/^\/?assets\//.test(src)) {
    return src;
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

  if (IS_LOCAL_BACKEND) {
    return `${imageBaseUrl}?slug=${encodeURIComponent(`${fixedSource.slice(1)}/${width}.webp`)}`;
  }

  // encodeURI, matching image-loader.js. Keys with spaces exist, and the two
  // must agree: next/image goes through the loader, OpenGraph/meta tags come
  // through here, and a mismatch means two URLs for one image.
  return `${cloudFrontUrl}${encodeURI(fixedSource)}/${width}.webp`;
};

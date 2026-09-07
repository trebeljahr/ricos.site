import path from "node:path";

// In local-dev mode, images go through the in-process /api/local-image route (which
// reads from MinIO, transforms via sharp, caches to the local resized bucket).
// In prod/cloud mode, they come from CloudFront.
const CLOUDFRONT_ID = process.env.NEXT_PUBLIC_CLOUDFRONT_ID;
const IS_LOCAL_BACKEND = process.env.NEXT_PUBLIC_IMAGE_BACKEND === "local" || !CLOUDFRONT_ID;

export default function myLoader({ src, width }) {
  if (!src) return src;
  if (src.startsWith("http")) {
    return src;
  }

  // Static files that aren't under /assets/ (favicons, og placeholders, etc.)
  // are served directly from /public — don't route them through the image
  // pipeline.
  if (!/^\/?assets\//.test(src)) {
    return src;
  }

  const parsedPath = path.parse(src);
  const noExt = path.join(parsedPath.dir, parsedPath.name);
  const fixedSlash = noExt.startsWith("/") ? noExt : `/${noExt}`;

  if (IS_LOCAL_BACKEND) {
    return `/api/local-image?slug=${encodeURIComponent(`${fixedSlash.slice(1)}/${width}.webp`)}`;
  }

  return `https://${CLOUDFRONT_ID}.cloudfront.net${encodeURI(fixedSlash)}/${width}.webp`;
}

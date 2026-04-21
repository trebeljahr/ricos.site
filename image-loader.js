import path from "path";

// In local-dev mode, images go through the in-process /api/img route (which
// reads from MinIO, transforms via sharp, caches to the local resized bucket).
// In prod/cloud mode, they come from CloudFront. Shape of both URLs is:
//   <base>/<key-without-ext>/<width>.webp
const IS_LOCAL_BACKEND = process.env.NEXT_PUBLIC_IMAGE_BACKEND === "local";

export default function myLoader({ src, width }) {
  if (src.startsWith("http")) {
    return src;
  }

  const parsedPath = path.parse(src);
  const noExt = path.join(parsedPath.dir, parsedPath.name);
  const fixedSlash = noExt.startsWith("/") ? noExt : `/${noExt}`;
  const fixedSource = fixedSlash.replace(" ", "%20");

  if (IS_LOCAL_BACKEND) {
    return `/api/img${fixedSource}/${width}.webp`;
  }

  return `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net${fixedSource}/${width}.webp`;
}

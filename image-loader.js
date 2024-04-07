import path from "path";

export default function myLoader({ src, width, quality }) {
  if (src.startsWith("http")) {
    return src;
  }

  const parsedPath = path.parse(src);
  const noExt = path.join(parsedPath.dir, parsedPath.name);
  const fixedSource = noExt.startsWith("/") ? noExt : `/${noExt}`;

  return `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net${fixedSource}/${width}.webp`;
}

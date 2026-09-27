// Next bundles this loader into the browser for every next/image call, and
// webpack (unlike Turbopack) refuses to bundle `node:`-prefixed builtins:
//   Module build failed: UnhandledSchemeError: Reading from "node:path" is not
//   handled by plugins (Unhandled scheme).
// node:path was only used for `path.parse` + `path.join`, so both are inlined
// below. Same pair as in src/lib/mapToImageProps.ts, which has to keep
// producing the identical URL for every image — change them together.

/** `path.parse(p).ext` removed, leaving `dir` + `name` joined by "/". */
function stripExtension(p) {
  const base = p.slice(p.lastIndexOf("/") + 1);
  const dot = base.lastIndexOf(".");
  // A leading dot belongs to the name: path.parse("/.env").name is ".env".
  return dot > 0 ? p.slice(0, p.length - (base.length - dot)) : p;
}

/** What `path.join` does after concatenating: collapse "//", resolve "." / "..". */
function normalizePosix(p) {
  const isAbsolute = p.startsWith("/");
  const segments = [];
  for (const segment of p.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === ".." && segments.length > 0 && segments.at(-1) !== "..") segments.pop();
    else if (segment !== ".." || !isAbsolute) segments.push(segment);
  }
  const joined = segments.join("/");
  if (isAbsolute) return `/${joined}`;
  return joined || ".";
}

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

  const noExt = normalizePosix(stripExtension(src));
  const fixedSlash = noExt.startsWith("/") ? noExt : `/${noExt}`;

  if (IS_LOCAL_BACKEND) {
    return `/api/local-image?slug=${encodeURIComponent(`${fixedSlash.slice(1)}/${width}.webp`)}`;
  }

  return `https://${CLOUDFRONT_ID}.cloudfront.net${encodeURI(fixedSlash)}/${width}.webp`;
}

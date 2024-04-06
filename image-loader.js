export default function myLoader({ src, width, quality }) {
  if (src.startsWith("http")) {
    return src;
  }

  const fixedSource = src.startsWith("/") ? src : `/${src}`;

  if (quality) {
    return `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net${fixedSource}?format=webp&quality=${quality}&width=${width}`;
  } else
    return `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net${fixedSource}?format=webp&width=${width}`;
}

export default function myLoader({ src, width, quality }) {
  if (src.startsWith("http")) {
    return src;
  }

  if (quality) {
    return `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net${src}?format=auto&quality=${quality}&width=${width}`;
  } else
    return `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net${src}?format=auto&width=${width}`;
}

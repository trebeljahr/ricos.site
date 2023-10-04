export default function myLoader({ src, width, quality }) {
  if (quality) {
    return ` https://d2mpovkbhuoejh.cloudfront.net${src}?format=auto&quality=${quality}&width=${width}`;
  } else
    return ` https://d2mpovkbhuoejh.cloudfront.net${src}?format=auto&width=${width}`;
}

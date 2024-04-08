import Head from "next/head";
import { nextImageUrl } from "src/lib/mapToImageProps";
interface OpenGraphProps {
  title: string;
  description: string;
  url?: string;
  image?: string;
  articleSection?: string;
  articlePublishedTime?: string;
  imageAlt?: string;
}

export const OpenGraph: React.FC<OpenGraphProps> = ({
  title,
  description,
  url: providedLinkUrl = "",
  image: providedImageUrl = "",
  articleSection: section,
  articlePublishedTime: publishedTime,
  imageAlt = "",
}) => {
  const baseUrl = "https://trebeljahr.com";
  const imageBaseUrl = `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net`;
  const url = new URL(providedLinkUrl, baseUrl).toString();
  const imageUrl = nextImageUrl(
    new URL(providedImageUrl, imageBaseUrl).toString(),
    1080
  );

  return (
    <Head>
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {url && <meta property="og:url" content={url} />}
      {imageUrl && <meta property="og:image" content={imageUrl} />}
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="trebeljahr.com" />
      <meta property="og:type" content="website" />
      <meta property="article:author" content={"Rico Trebeljahr"} />

      {section && <meta property="article:section" content={section} />}
      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ricotrebeljahr" />
      <meta name="twitter:creator" content="@ricotrebeljahr" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
      {imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}
    </Head>
  );
};

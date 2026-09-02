import Head from "next/head";
import type { FC } from "react";
import { nextImageUrl } from "src/lib/mapToImageProps";
import { completeUrl, tld } from "src/lib/urlUtils";

/**
 * Site-wide fallback share card. Served straight from /public (not through the
 * image pipeline), so it stays valid even for pages that have no cover image of
 * their own. Regenerate with `npx tsx src/scripts/generateDefaultOgImage.ts`.
 */
export const defaultOgImage = "/og-default.png";
export const defaultOgImageAlt =
  "ricos.site — essays, photography, notes and Three.js experiments by Rico Trebeljahr";
const defaultOgImageWidth = 1200;
const defaultOgImageHeight = 630;

/** Width we request from the image pipeline for share cards. */
const ogImageRenderWidth = 1080;

interface OpenGraphProps {
  title: string;
  description: string;
  url?: string;
  image?: string;
  articleSection?: string;
  articlePublishedTime?: string;
  imageAlt?: string;
  /** Intrinsic width of `image`, used to derive the rendered og:image:height. */
  imageWidth?: number;
  /** Intrinsic height of `image`, used to derive the rendered og:image:height. */
  imageHeight?: number;
  ogType?: "website" | "article";
}

export const OpenGraph: FC<OpenGraphProps> = ({
  title,
  description,
  url: providedLinkUrl = "",
  image: providedImageUrl = "",
  articleSection: section,
  articlePublishedTime: publishedTime,
  imageAlt = "",
  imageWidth,
  imageHeight,
  ogType = "website",
}) => {
  const url = completeUrl(providedLinkUrl);

  // nextImageUrl returns "" for an empty src, and passes non-/assets/ paths
  // through untouched — either way, fall back to the site-wide share card so
  // og:image is never missing.
  const pipelineUrl = nextImageUrl(providedImageUrl, ogImageRenderWidth);
  const usingDefaultImage = !pipelineUrl;

  // Scrapers ignore relative og:image URLs, so always emit an absolute one.
  // completeUrl leaves already-absolute CloudFront URLs untouched.
  const imageUrl = completeUrl(usingDefaultImage ? defaultOgImage : pipelineUrl);

  const resolvedImageAlt = usingDefaultImage ? defaultOgImageAlt : imageAlt;
  const imageType = usingDefaultImage ? "image/png" : "image/webp";
  const width = usingDefaultImage ? defaultOgImageWidth : ogImageRenderWidth;
  const height = usingDefaultImage
    ? defaultOgImageHeight
    : imageWidth && imageHeight
      ? Math.round((ogImageRenderWidth * imageHeight) / imageWidth)
      : undefined;

  return (
    <Head>
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta property="og:image:width" content={String(width)} />
      {height && <meta property="og:image:height" content={String(height)} />}
      <meta property="og:image:type" content={imageType} />
      {resolvedImageAlt && <meta property="og:image:alt" content={resolvedImageAlt} />}
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content={tld} />
      <meta property="og:type" content={ogType} />
      <meta property="article:author" content={"Rico Trebeljahr"} />

      {section && <meta property="article:section" content={section} />}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@ricotrebeljahr" />
      <meta name="twitter:creator" content="@ricotrebeljahr" />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={imageUrl} />
      {resolvedImageAlt && <meta name="twitter:image:alt" content={resolvedImageAlt} />}
    </Head>
  );
};

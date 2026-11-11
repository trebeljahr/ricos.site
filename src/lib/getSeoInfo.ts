import seoMetadata from "../content/seo-metadata.json";

export type SeoInfo = {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  ogImageAlt: string;
  /** Size of `ogImage` when it is a file in public/, which skips the image pipeline. */
  ogImageWidth?: number;
  ogImageHeight?: number;
  keywords: string[];
};

type SeoMetadataMap = Record<string, SeoInfo>;

const seoData: SeoMetadataMap = seoMetadata as SeoMetadataMap;

export function getSeoInfo(url: string): SeoInfo | null {
  return seoData[url] || null;
}

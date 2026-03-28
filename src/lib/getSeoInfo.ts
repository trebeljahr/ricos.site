import seoMetadata from "../content/seo-metadata.json";

export type SeoInfo = {
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  ogImageAlt: string;
  keywords: string[];
};

type SeoMetadataMap = Record<string, SeoInfo>;

const seoData: SeoMetadataMap = seoMetadata as SeoMetadataMap;

export function getSeoInfo(url: string): SeoInfo | null {
  return seoData[url] || null;
}

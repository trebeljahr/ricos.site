import Head from "next/head";
interface OpenGraphProps {
  title: string;
  description: string;
  url?: string;
  image?: string;
  articleSection?: string;
  articlePublishedTime?: string;
}

export const OpenGraph: React.FC<OpenGraphProps> = ({
  title,
  description,
  url,
  image,
  articleSection: section,
  articlePublishedTime: publishedTime,
}) => {
  return (
    <Head>
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="trebeljahr.com" />
      <meta property="og:type" content="website" />
      <meta property="article:author" content={"Rico Trebeljahr"} />

      {section && <meta property="article:section" content={section} />}
      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}

      <meta
        name="twitter:card"
        content={image ? "summary_large_image" : "summary"}
      />
      <meta name="twitter:site" content="@ricotrebeljahr" />
      <meta name="twitter:creator" content="@ricotrebeljahr" />

      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      {image && <meta name="twitter:image" content={image} />}
    </Head>
  );
};

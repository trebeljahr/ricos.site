import Head from "next/head";
import { baseUrl, completeUrl } from "src/lib/urlUtils";
interface Props {
  description: string;
  title: string;
  keywords?: string[];
  url: string;
}

const defaultKeywords = [
  "writing",
  "traveling",
  "blog",
  "photography",
  "programming",
  "web development",
  "software engineering",
  "self-improvement",
  "personal growth",
  "life lessons",
  "life advice",
  "life tips",
  "life hacks",
  "productivity",
  "mindfulness",
  "minimalism",
  "digital minimalism",
  "travel stories",
  "travel tips",
  "travel advice",
  "AI",
  "machine learning",
  "data science",
  "AI news",
  "AI development",
  "needlestack",
];

const generalKeywords = [
  "Rico Trebeljahr",
  "Rico's Site",
  "Rico's Blog",
  "Rico's Writing",
  "Rico's Work",
  "Rico's Life",
  "trebeljahr.com",
  "www.trebeljahr.com",
  "ricos.blog",
  "ricos.garden",
  "ricos.wiki",
  "wiki",
  "ricos.site",
  "writing",
  "blog",
];

export const Meta = ({
  description,
  title,
  keywords = defaultKeywords,
  url,
}: Props) => {
  return (
    <>
      <Head>
        <title>{`${title} | ricos.site`}</title>

        <link rel="canonical" href={completeUrl(url)} />

        <meta name="description" content={description} />
        <meta name="application-name" content="Rico's Site" />
        <meta name="author" content="Rico Trebeljahr" />
        <link rel="author" href={baseUrl} />

        <meta name="generator" content="Next.js" />
        <meta
          name="keywords"
          content={[...new Set([...keywords, ...generalKeywords])].join(", ")}
        />
        <meta name="referrer" content="origin-when-cross-origin" />
        <meta name="color-scheme" content="dark" />
        <meta name="creator" content="Rico Trebeljahr" />
        <meta name="publisher" content="Rico Trebeljahr" />
        <meta
          name="format-detection"
          content="telephone=no, address=no, email=no"
        />
      </Head>
    </>
  );
};

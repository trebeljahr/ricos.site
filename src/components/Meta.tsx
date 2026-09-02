import Head from "next/head";
import { completeUrl } from "src/lib/urlUtils";

interface Props {
  description: string;
  title: string;
  keywords?: string[];
  url: string;
  noindex?: boolean;
  hasMath?: boolean;
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
  "ricos.blog",
  "ricos.garden",
  "ricos.wiki",
  "ricos.site",
  "wiki",
  "writing",
  "blog",
];

export const Meta = ({
  description,
  title,
  keywords = defaultKeywords,
  url,
  noindex = false,
  hasMath = false,
}: Props) => {
  return (
    <Head>
      <title>{title}</title>

      {/* "follow" is deliberate: these pages should stay out of the index, but
          crawlers must still traverse their outgoing links. Stub booknotes link
          to plenty of indexable pages, and "nofollow" turned them into crawl
          dead-ends. */}
      {noindex && <meta name="robots" content="noindex, follow" />}
      <link rel="canonical" href={completeUrl(url)} />

      {/* KaTeX styles are ~21KB and only 5 pages render math, so they are not
          part of the global bundle. Vendored under /public/katex so the
          @font-face url(fonts/...) refs resolve next to the stylesheet. */}
      {hasMath && <link rel="stylesheet" href="/katex/katex.min.css" />}

      <meta name="description" content={description} />
      <meta name="application-name" content="ricos.site" />

      {/* Pinterest Domain Verification */}
      <meta name="p:domain_verify" content="d355ee7955ac253c916874514a8ee100" />

      <meta name="generator" content="Next.js" />
      <meta name="keywords" content={[...new Set([...keywords, ...generalKeywords])].join(", ")} />
      <meta name="referrer" content="origin-when-cross-origin" />
      <meta name="color-scheme" content="dark" />

      <meta name="author" content="Rico Trebeljahr" />
      <meta name="creator" content="Rico Trebeljahr" />
      <meta name="publisher" content="Rico Trebeljahr" />
      <meta name="format-detection" content="telephone=no, address=no, email=no" />
    </Head>
  );
};

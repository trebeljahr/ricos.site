import fs from "node:fs";
import path from "node:path";
import { Feed } from "feed";
import { baseUrl } from "src/lib/urlUtils";
import { byOnlyPublished } from "src/lib/utils/filters";
import booknotes from "../../.velite/booknotes.json";
import newsletters from "../../.velite/newsletters.json";
import posts from "../../.velite/posts.json";
import travelblogs from "../../.velite/travelblogs.json";

function buildImageUrl(coverSrc: string): string | undefined {
  const cloudfrontId = process.env.NEXT_PUBLIC_CLOUDFRONT_ID;
  if (!cloudfrontId) return undefined;

  const parsedPath = path.parse(coverSrc);
  const noExt = path.join(parsedPath.dir, parsedPath.name);
  const fixedSource = noExt.startsWith("/") ? noExt : `/${noExt}`;
  return `https://${cloudfrontId}.cloudfront.net${fixedSource}/1080.webp`;
}

async function generateRssFeed() {
  if (!process.env.NEXT_PUBLIC_CLOUDFRONT_ID) {
    console.warn("Warning: NEXT_PUBLIC_CLOUDFRONT_ID not set — RSS feed images will be omitted");
  }

  const feed = new Feed({
    title: "ricos.site | RSS Feed",
    description: "Posts, newsletters, book notes, and travel stories by Rico Trebeljahr",
    id: baseUrl,
    link: baseUrl,
    updated: new Date(),
    language: "en",
    favicon: baseUrl + "/favicon/favicon.ico",
    copyright: `All rights reserved ${new Date().getFullYear()}, Rico Trebeljahr`,
    generator: "ricos.site",
    feedLinks: {
      json: baseUrl + "/feed.json",
      atom: baseUrl + "/atom.xml",
      rss: baseUrl + "/rss.xml",
    },
    author: {
      name: "Rico Trebeljahr",
      link: baseUrl,
    },
  });

  const allContent = [
    ...posts.filter(byOnlyPublished),
    ...newsletters.filter(byOnlyPublished),
    // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
    ...booknotes.filter((b: any) => byOnlyPublished(b) && b.summary && b.summary === true),
    ...travelblogs.filter(byOnlyPublished),
  ];

  // biome-ignore lint/complexity/noForEach: callback uses early return / vendored script
  allContent
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach((item) => {
      const link = `${baseUrl}${item.link}`;
      const image = buildImageUrl(item.cover.src);

      feed.addItem({
        title: item.title,
        description: item.excerpt || "",
        link,
        ...(image ? { image } : {}),
        date: new Date(item.date),
        category: [{ name: item.contentType }],
      });
    });

  fs.writeFileSync("./public/rss.xml", feed.rss2());
  fs.writeFileSync("./public/atom.xml", feed.atom1());
  fs.writeFileSync("./public/feed.json", feed.json1());

  console.log(`RSS feed generated with ${allContent.length} items`);
}

generateRssFeed();

import { allNewsletters, Newsletter, Post } from "@contentlayer/generated";
import fs from "fs";
import RSS from "rss";

export default async function generateRssFeed(allPosts: Post[]) {
  const site_url =
    process.env.NODE_ENV === "production"
      ? "https://trebeljahr.com"
      : "http://localhost:3000";

  const feedOptions = {
    title: "Blog posts | RSS Feed",
    description: "Welcome to this blog posts!",
    site_url: site_url,
    feed_url: `${site_url}/rss.xml`,
    image_url: `${site_url}/logo.jpeg`,
    pubDate: new Date(),
    copyright: `All rights reserved ${new Date().getFullYear()}`,
  };

  const feed = new RSS(feedOptions);

  // Add each individual post to the feed.
  [...allPosts.filter(({ published }) => published), ...allNewsletters].forEach(
    (post: Post | Newsletter) => {
      feed.item({
        title: post.title,
        description: post.excerpt || "",
        url: `${site_url}${post.slug}`,
        date: post.date,
      });
    }
  );

  // Write the RSS feed to a file as XML.
  fs.writeFileSync("./public/rss.xml", feed.xml({ indent: true }));
}

import slugify from "@sindresorhus/slugify";
import { Feed } from "feed";
import fs from "fs";
import matter from "gray-matter";
import path from "path";
import { byOnlyPublished } from "src/lib/utils";

async function generateRssFeed() {
  const site_url = "https://trebeljahr.com";

  const feed = new Feed({
    title: "ricos.site | RSS Feed",
    description: "Welcome to my posts and newsletters! Glad to have you here!",
    id: site_url,
    link: site_url,
    updated: new Date(),
    language: "en",
    favicon: site_url + "/favicon/favicon.ico",
    copyright: `All rights reserved ${new Date().getFullYear()}, Rico Trebeljahr`,
    generator: "awesome",
    feedLinks: {
      json: site_url + "/feed.json",
      atom: site_url + "/atom.xml",
      rss: site_url + "/rss.xml",
    },
    author: {
      name: "Rico Trebeljahr",
      link: site_url,
    },
  });

  const posts = fs.readdirSync("./src/content/Notes/posts").map((file) => {
    const postContent = fs.readFileSync(
      "./src/content/Notes/posts/" + file,
      "utf8"
    );
    const post = matter(postContent);
    return {
      ...post.data,
      slug: `/posts/${slugify(file.replace(/\.md?/, ""))}`,
    } as any;
  });

  // console.log(posts);

  const newsletters = fs
    .readdirSync("./src/content/Notes/newsletter-stuff/newsletters")
    .map((file) => {
      const newsletterContent = fs.readFileSync(
        "./src/content/Notes/newsletter-stuff/newsletters/" + file,
        "utf8"
      );
      const newsletter = matter(newsletterContent);
      return {
        ...newsletter.data,
        slug: `/newsletters/${slugify(file.replace(/\.md?/, ""))}`,
      } as any;
    });

  // console.log(newsletters);

  const allContent = [...posts, ...newsletters];

  allContent.filter(byOnlyPublished).forEach((post) => {
    const link = `${site_url}${post.slug}`;

    const parsedPath = path.parse(post.cover.src);
    const noExt = path.join(parsedPath.dir, parsedPath.name);
    const fixedSource = noExt.startsWith("/") ? noExt : `/${noExt}`;

    const image = `https://${process.env.NEXT_PUBLIC_CLOUDFRONT_ID}.cloudfront.net${fixedSource}/1080.webp`;

    feed.addItem({
      title: post.title,
      description: post.excerpt || "",
      link,
      image,
      date: new Date(post.date),
    });
  });

  // console.log(feed);

  fs.writeFileSync("./public/rss.xml", feed.rss2());
  fs.writeFileSync(`./public/atom.xml`, feed.atom1());
  fs.writeFileSync(`./public/feed.json`, feed.json1());
}

generateRssFeed();

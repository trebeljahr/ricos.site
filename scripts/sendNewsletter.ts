import { readFile } from "fs/promises";
import { newsletterListMail, sendEmail } from "./mailgun.js";
import { unified } from "unified";
import path from "path";
import Handlebars from "handlebars";

import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeUrls from "rehype-urls";
import rehypePresetMinify from "rehype-preset-minify";
import rehypeStringify from "rehype-stringify";

const newsletterNumber = 1;
const LIVE_HOST = "https://trebeljahr.com";
const HOST =
  process.env.NODE_ENV === "production" ? LIVE_HOST : "http://localhost:3000";

async function main() {
  const emailHandlebarsFile = await readFile(
    path.join(process.cwd(), "..", "email-templates", "newsletter.hbs"),
    "utf-8"
  );

  const mdFileRaw = await readFile(
    path.join(process.cwd(), "..", "newsletters", `${newsletterNumber}`),
    "utf-8"
  );

  function addHost(url: any, node: any) {
    if (url.path.startsWith("/")) {
      return LIVE_HOST + url.path;
    }
  }

  function logUrls(url: any, node: any) {
    console.log(url);
    console.log(node);
  }

  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeUrls, addHost)
    .use(rehypeUrls, logUrls)
    .use(rehypePresetMinify)
    .use(rehypeStringify)
    .process(mdFileRaw);

  const template = Handlebars.compile(emailHandlebarsFile);

  const image = `${LIVE_HOST}/assets/newsletter/${newsletterNumber}.jpg`;
  const webversion = `${HOST}/newsletters/${newsletterNumber}`;

  const htmlEmail = template({ content: file.value, image, webversion });

  const data = {
    from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
    to: newsletterListMail,
    subject: "Newsletter Trebeljahr.com 1",
    html: htmlEmail,
    text: mdFileRaw,
  };

  console.log("Sending email...");
  await sendEmail(data);
  console.log("Done!");
}

main();

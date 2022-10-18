import { readFile } from "fs/promises";
import { newsletterListMail, sendEmail } from "./mailgun.js";
import { unified } from "unified";
import path from "path";
import Handlebars from "handlebars";

import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRewrite from "rehype-rewrite";
import rehypeUrls from "rehype-urls";
import rehypePresetMinify from "rehype-preset-minify";
import rehypeStringify from "rehype-stringify";

const newsletterNumber = 3;
const LIVE_HOST = "https://trebeljahr.com";

const HOST =
  process.env.NODE_ENV === "production"
    ? LIVE_HOST
    : "https://trebeljahr.vercel.app/";

async function main() {
  const emailHandlebarsFile = await readFile(
    path.join(
      process.cwd(),
      "..",
      "src",
      "content",
      "email-templates",
      "newsletter.hbs"
    ),
    "utf-8"
  );

  const mdFileRaw = await readFile(
    path.join(
      process.cwd(),
      "..",
      "src",
      "content",
      "newsletters",
      `${newsletterNumber}`
    ),
    "utf-8"
  );

  function addHost(url: any) {
    if (url.href.startsWith("/")) {
      return HOST + url.path;
    }
  }

  function rewrite(node: any) {
    if (node.type === "element" && node.tagName === "img") {
      node.properties = {
        ...node.properties,
        width: "600",
        height: "",
        border: "0",
        style: `
          width: 100%;
          max-width: 600px;
          height: auto;
          background: #dddddd;
          font-family: sans-serif;
          font-size: 15px;
          line-height: 15px;
          color: #555555;
          margin: 10px auto;
          display: block;
        `,
        class: "g-img",
      };
    } else if (
      node.type === "element" &&
      node.tagName.startsWith("h") &&
      node.tagName.length === 2
    ) {
      node.properties = {
        ...node.properties,
        style: `
          margin: 0;
          margin-top: 3rem;
          margin-bottom: 1rem;
        `,
      };
    } else if (node.type === "element" && node.tagName === "p") {
      node.properties = {
        ...node.properties,
        style: `
          margin: 0;
          margin-bottom: 1.5rem;
        `,
      };
    }
  }

  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeUrls, addHost)
    .use(rehypeRewrite, { rewrite })
    .use(rehypePresetMinify)
    .use(rehypeStringify)
    .process(mdFileRaw);

  const template = Handlebars.compile(emailHandlebarsFile);

  const image = `${HOST}/assets/newsletter/${newsletterNumber}.jpg`;
  const webversion = `${HOST}/newsletters/${newsletterNumber}`;

  const htmlEmail = template({ content: file.value, image, webversion });

  const data = {
    from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
    to: newsletterListMail,
    subject: `Newsletter #${newsletterNumber} | trebeljahr.com`,
    html: htmlEmail,
    text: mdFileRaw,
  };

  await sendEmail(data);
  console.log("Successfully sent email!");
}

main();

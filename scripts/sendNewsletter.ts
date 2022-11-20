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
import matter from "gray-matter";

const newsletterNumber = 4;
const LIVE_HOST = "https://trebeljahr.com";

const HOST =
  process.env.NODE_ENV === "production" || process.env.TESTING
    ? LIVE_HOST
    : "https://trebeljahr.vercel.app";

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
      `${newsletterNumber}.md`
    ),
    "utf-8"
  );

  const {
    content,
    data: { cover, title },
  } = matter(mdFileRaw);

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
          background: #ffffff;
          font-family: sans-serif;
          font-size: 15px;
          line-height: 15px;
          color: #333333;
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
    }
  }

  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeUrls, addHost)
    .use(rehypeRewrite, { rewrite })
    .use(rehypePresetMinify)
    .use(rehypeStringify)
    .process(content);

  const template = Handlebars.compile(emailHandlebarsFile);

  const webversion = `${HOST}/newsletters/${newsletterNumber}`;
  const realTitle = `${title} | #${newsletterNumber}`;

  const htmlEmail = template({
    content: file.value,
    title,
    coverImageSrc: `${HOST}${cover.src}`,
    coverImageAlt: cover.alt,
    webversion,
  });

  const data = {
    from: "Rico Trebeljahr <rico@trebeljahr.com>",
    to: newsletterListMail,
    subject: `${realTitle}`,
    html: htmlEmail,
    text: mdFileRaw,
  };

  await sendEmail(data);
  console.log("Successfully sent email!");
}

main();

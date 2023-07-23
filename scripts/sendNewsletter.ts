import { readFile } from "fs/promises";
import Handlebars from "handlebars";
import path from "path";
import { unified } from "unified";
import { newsletterListMail, sendEmail } from "./mailgun.js";

import matter from "gray-matter";
import rehypePresetMinify from "rehype-preset-minify";
import rehypeRewrite from "rehype-rewrite";
import rehypeStringify from "rehype-stringify";
import rehypeUrls from "rehype-urls";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";

const newsletterNumber = 21;

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
    data: { cover, title, excerpt },
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
        alt: node?.properties?.alt?.replace(/\/[^\/]*\//g, "") || "",
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

  const defaultExcerpt =
    "Live and Learn is a Newsletter filled with awesome links...";

  const realTitle = `${title} | Live and Learn #${newsletterNumber}`;

  const htmlEmail = template({
    content: file.value,
    title: realTitle,
    excerpt: excerpt || defaultExcerpt,
    coverImageSrc: `${HOST}${cover.src}`,
    coverImageAlt: cover.alt,
    webversion,
  });

  const data = {
    from: "Rico Trebeljahr <rico@trebeljahr.com>",
    to: newsletterListMail,
    subject: `🌱 ${title} | #${newsletterNumber}`,
    html: htmlEmail,
    text: `
🌱 ${realTitle}


${excerpt}

You can read also [read this on the web](${webversion}).

![${cover.alt}](${cover.src})

${content}

[Unsubscribe](%mailing_list_unsubscribe_url%)

Thanks for reading plaintext emails. You're cool!


`,
  };

  await sendEmail(data);
  console.log("Successfully sent email!");
}

main();

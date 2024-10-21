import slugify from "@sindresorhus/slugify";
import "dotenv/config";
import { readFile } from "fs/promises";
import matter from "gray-matter";
import Handlebars from "handlebars";
import path from "path";
import rehypePresetMinify from "rehype-preset-minify";
import rehypeRewrite from "rehype-rewrite";
import rehypeStringify from "rehype-stringify";
import rehypeUrls from "rehype-urls";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { newsletterListMail, sendEmail } from "src/lib/mailgun.js";
import { nextImageUrl } from "src/lib/mapToImageProps.js";
import { unified } from "unified";
import { newsletterPath, sortedNewsletterNames } from "./sortedNewsletters.js";

const number = sortedNewsletterNames[0].replace(".md", "");

const HOST = "https://trebeljahr.com";

async function main() {
  const emailHandlebarsFile = await readFile(
    path.join(
      process.cwd(),
      "src",
      "content",
      "email-templates",
      "newsletter.hbs"
    ),
    "utf-8"
  );

  const mdFileRaw = await readFile(
    path.join(newsletterPath, `${number}.md`),
    "utf-8"
  );

  const {
    content,
    data: { cover, title, excerpt },
  } = matter(mdFileRaw);

  function addHost(url: { href: string; path: string }) {
    if (
      url.href.startsWith("/") &&
      (url.href.endsWith(".webp") ||
        url.href.endsWith(".jpg") ||
        url.href.endsWith(".png") ||
        url.href.endsWith(".jpeg") ||
        url.href.endsWith(".gif") ||
        url.href.endsWith(".svg"))
    ) {
      const smallImageUrl = nextImageUrl(url.href, 1080);
      return smallImageUrl;
    } else if (url.href.startsWith("/")) {
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
    .use(remarkParse as any)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeUrls, addHost)
    .use(rehypeRewrite as any, { rewrite })
    .use(rehypePresetMinify as any)
    .use(rehypeStringify as any)
    .process(content);

  const template = Handlebars.compile(emailHandlebarsFile);

  const webversion = `${HOST}/newsletters/${slugify(title)}`;

  const defaultExcerpt =
    "Live and Learn is a Newsletter filled with awesome links...";

  const realTitle = `${title} | Live and Learn #${number}`;

  const htmlEmail = template({
    content: file.value,
    title: realTitle,
    excerpt: excerpt || defaultExcerpt,
    coverImageSrc: nextImageUrl(cover.src, 1080),
    coverImageAlt: cover.alt,
    webversion,
  });

  const data = {
    from: "Rico Trebeljahr <rico@trebeljahr.com>",
    to: newsletterListMail,
    subject: `🌱 ${title} | #${number}`,
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

  console.log(title, ":\n", `Sending newsletter ${number}...`);
  await sendEmail(data);
  console.log("Successfully sent email!");
}

main();

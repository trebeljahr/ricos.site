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
import { nextImageUrl } from "src/lib/mapToImageProps.js";
import { unified } from "unified";
import { sortedNewsletters } from "./sortedNewsletters.js";
import { sluggify } from "src/lib/sluggify.js";
import { sendEmail, newsletterListMail } from "src/lib/mailgun.js";

const number = sortedNewsletters[0].replace(".md", "");

const LIVE_HOST = "https://trebeljahr.com";

const HOST =
  process.env.NODE_ENV === "production" || process.env.TESTING
    ? LIVE_HOST
    : "https://trebeljahr.vercel.app";

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
    path.join(process.cwd(), "src", "content", "newsletters", `${number}.md`),
    "utf-8"
  );

  const {
    content,
    data: { cover, title, excerpt, sent: alreadySent },
  } = matter(mdFileRaw);

  console.log(title.replaceAll(" ", "-").replaceAll(",", "").toLowerCase());

  function addHost(url: { href: string; path: string }) {
    if (url.href.startsWith("/") && url.href.endsWith(".webp")) {
      const smallImageUrl = nextImageUrl(url.href, 1024);
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
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeUrls, addHost)
    .use(rehypeRewrite, { rewrite })
    .use(rehypePresetMinify)
    .use(rehypeStringify)
    .process(content);

  const template = Handlebars.compile(emailHandlebarsFile);

  const webversion = `${HOST}/newsletters/${sluggify(title)}`;

  const defaultExcerpt =
    "Live and Learn is a Newsletter filled with awesome links...";

  const realTitle = `${title} | Live and Learn #${number}`;

  const htmlEmail = template({
    content: file.value,
    title: realTitle,
    excerpt: excerpt || defaultExcerpt,
    coverImageSrc: nextImageUrl(cover.src, 1024),
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

  if (process.env.NODE_ENV === "production" && alreadySent) {
    console.log("Newsletter already sent!");
  } else {
    console.log("Sending newsletter...");
    await sendEmail(data);
    console.log("Successfully sent email!");
  }
}

main();

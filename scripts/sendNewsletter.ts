import { readFile } from "fs/promises";
import { newsletterListMail, sendEmail } from "./mailgun.js";
import { unified } from "unified";
import path from "path";
import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import Handlebars from "handlebars";

const newsletterNumber = 1;
const HOST =
  process.env.NODE_ENV === "production"
    ? "https://trebeljahr.com"
    : "http://localhost:3000";

async function main() {
  const emailHandlebarsFile = await readFile(
    path.join(process.cwd(), "..", "email-templates", "newsletter.hbs"),
    "utf-8"
  );

  const mdFileRaw = await readFile(
    path.join(process.cwd(), "..", "newsletters", `${newsletterNumber}`),
    "utf-8"
  );
  const file = await unified()
    .use(remarkParse)
    .use(remarkHtml)
    .process(mdFileRaw);

  const template = Handlebars.compile(emailHandlebarsFile);

  const image = `${HOST}/assets/newsletter/${newsletterNumber}.jpg`;
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

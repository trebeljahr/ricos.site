import Handlebars from "handlebars";
import { readFile } from "fs/promises";
// import { read } from "to-vfile";
import { newsletterListMail } from "../lib/mailgun";
import remarkParse1 from "remark-parse";
import remarkHtml1 from "remark-html";

import path from "path";
import { type Processor } from "unified";
type Unified = () => Processor;

let unified: Unified | undefined;

async function getUnified(): Promise<Unified> {
  if (typeof unified !== "undefined") return unified;
  const mod = await (eval(`import('unified')`) as Promise<
    typeof import("unified")
  >);
  ({ unified } = mod);
  return unified;
}

let remarkParse: any | undefined;
async function getRemarkParse(): Promise<any> {
  if (typeof remarkParse !== "undefined") return remarkParse;
  const mod = await (eval(`import('remark-parse')`) as Promise<
    typeof import("remark-parse")
  >);
  remarkParse = mod;
  return remarkParse;
}

let remarkHtml: any | undefined;
async function getRemarkHtml(): Promise<any> {
  if (typeof remarkHtml !== "undefined") return remarkHtml;
  const mod: any = await (eval(`import('remark-html')`) as Promise<
    typeof import("remark-html")
  >);

  remarkHtml = mod;
  return remarkHtml;
}

let read: any | undefined;
async function getRead(): Promise<any> {
  if (typeof read !== "undefined") return read;
  const mod: any = await (eval(`import('to-vfile')`) as Promise<
    typeof import("to-vfile")
  >);

  ({ read } = mod);
  return read;
}

async function main() {
  await getUnified();
  await getRemarkParse();
  await getRemarkHtml();
  await getRead();
  if (!unified || !remarkParse || !remarkHtml || !read) return;

  const emailHandlebarsFile = await readFile(
    path.join(process.cwd(), "..", "email-templates", "newsletter.hbs"),
    "utf-8"
  );

  // const content = await readFile();
  // console.log(content);
  const file = await unified()
    .use(remarkParse)
    .use(remarkHtml)
    .process(await read(path.join(process.cwd(), "..", "newsletters", "1.md")));
  console.log(file);

  // const template = Handlebars.compile(emailHandlebarsFile);

  // const placeholder = {
  //   content: "Hello World, this is a newsletter!",
  //   secondHeader: "Second Headline",
  //   secondContent: "Some more content",
  //   thirdHeader: "Third Headline",
  //   thirdContent: "And some more content... ",
  // };

  // const htmlEmail = template(placeholder);
  // const data = {
  //   from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
  //   to: newsletterListMail,
  //   subject: "Newsletter Trebeljahr.com 1",
  //   html: htmlEmail,
  //   text: `Trebeljahr Newsletter
  //     ${placeholder.content}

  //     ${placeholder.secondHeader}
  //     ${placeholder.secondContent}

  //     ${placeholder.thirdHeader}
  //     ${placeholder.thirdContent}

  //     "To unsubscribe click: <%mailing_list_unsubscribe_url%>"
  //   `,
  // };

  // console.log("Sending email...");
  // await sendToNewsletterList(data);
  // console.log("Done!");
}

main();

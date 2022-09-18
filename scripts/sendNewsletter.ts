import Handlebars from "handlebars";
import { readFile } from "fs/promises";
// import { read } from "to-vfile";
// import { newsletterListMail } from "../lib/mailgun";
import path from "path";
import remarkHtml from "remark-html";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { read } from "to-vfile";

async function main() {
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

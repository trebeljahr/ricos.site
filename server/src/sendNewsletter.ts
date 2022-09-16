import Handlebars from "handlebars";
import { readFile } from "fs/promises";
import { newsletterListMail, sendToNewsletterList } from "./mailgun.js";

const emailHandlebarsFile = await readFile("./src/emailTemplate.hbs", "utf-8");
const template = Handlebars.compile(emailHandlebarsFile);

const placeholder = {
  content: "Hello World, this is a newsletter! ",
  secondHeader: "Second Headline ",
  secondContent: "Some more content ",
  thirdHeader: "Third Headline ",
  thirdContent: "And some more content... ",
};

const htmlEmail = template(placeholder);

console.log(htmlEmail);

const data = {
  from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
  to: newsletterListMail,
  subject: "Newsletter Trebeljahr.com 1",
  html: htmlEmail,
  text:
    placeholder.content +
    placeholder.secondHeader +
    placeholder.secondContent +
    placeholder.thirdHeader +
    placeholder.thirdContent,
};

await sendToNewsletterList(data);

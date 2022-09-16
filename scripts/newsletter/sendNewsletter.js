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
const data = {
  from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
  to: newsletterListMail,
  subject: "Newsletter Trebeljahr.com 1",
  html: htmlEmail,
  text: `Trebeljahr Newsletter
    ${placeholder.content}

    ${placeholder.secondHeader}
    ${placeholder.secondContent}

    ${placeholder.thirdHeader}
    ${placeholder.thirdContent}

    "To unsubscribe click: <%mailing_list_unsubscribe_url%>"
  `,
};

console.log("Sending email...");
await sendToNewsletterList(data);

console.log("Done!");

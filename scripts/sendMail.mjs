import { config } from "dotenv";
import mailgun from "mailgun-js";

config();

const mg = mailgun({
  apiKey: process.env.API_KEY,
  domain: process.env.DOMAIN,
  host: "api.eu.mailgun.net",
});

console.log("Sending mail with mailgun...");
console.log(process.env.API_KEY, process.env.DOMAIN);

const data = {
  from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
  to: "ricotrebeljahr@gmail.com",
  subject: "Hello",
  text: "Testing some Mailgun awesomness!",
};

await mg.messages().send(data);

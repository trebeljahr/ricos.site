import formData from "form-data";
import Mailgun from "mailgun.js";
import { config } from "dotenv";
config();

// @ts-ignore:next-line
const mailgun = new Mailgun(formData);

const DOMAIN = "newsletter.trebeljahr.com";
export const newsletterListMail =
  process.env.NODE_ENV === "production"
    ? `hi@${DOMAIN}`
    : process.env.TO_CUSTOM_MAIL || `test@${DOMAIN}`;

console.log(`Sending Newsletter to ${newsletterListMail}`);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "",
  url: "https://api.eu.mailgun.net",
});

type EmailData = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail(data: EmailData) {
  await mg.messages.create(DOMAIN, data);
}

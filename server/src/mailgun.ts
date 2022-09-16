import { config } from "dotenv";

import formData from "form-data";
import { Signup } from "./Signup.model.js";
import Mailgun from "mailgun.js";

config();

console.log(typeof Mailgun);
console.log(Mailgun);

// @ts-ignore:next-line
const mailgun = new Mailgun(formData);
console.log(mailgun);

const DOMAIN = process.env.DOMAIN || "";
export const newsletterListMail = `hi@${DOMAIN}`;

const mg = mailgun.client({
  username: "api",
  key: process.env.API_KEY || "",
  url: "https://api.eu.mailgun.net",
});

// console.log("Sending mail with mailgun...");
// console.log(process.env.API_KEY, process.env.DOMAIN);

// const data = {
//   from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
//   to: "ricotrebeljahr@gmail.com",
//   subject: "Hello",
//   text: "Testing some Mailgun awesomness!",
// };

type EmailData = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export async function deleteDomain() {
  const destroyedDomain = await mg.domains.destroy(
    "sandboxf09111c8e9aa47da869eb96201663b74.mailgun.org"
  );
  console.log("destroyedDomain", destroyedDomain);
}

export async function createNewMailingList() {
  const existingLists = await mg.lists.list();
  console.log(existingLists.items);

  if (existingLists.length !== 0) return;

  const newList = await mg.lists.create({
    address: newsletterListMail,
    name: "Trebeljahr's Newsletter List",
    description: "Default Newsletter List for newsletter.trebeljahr.com",
    access_level: "everyone", // readonly (default), members, everyone
  });

  console.log(newList);
}

export type Signup = {
  address: string;
  name: string;
  vars: {};
};

export async function addSignupToEmailList(signup: Signup) {
  const newMember = await mg.lists.members.createMember(newsletterListMail, {
    address: signup.address,
    name: signup.name,
    subscribed: "yes",
    upsert: "yes",
  });

  console.log(newMember);
}

export async function unsubscribeFromList(email: string) {
  // await Signup.findOneAndDelete({ email });
  await mg.lists.members.destroyMember(DOMAIN, email);
}

export async function sendEmail(data: EmailData) {
  await mg.messages.create(DOMAIN, data);
}

export async function sendToNewsletterList(data: EmailData) {
  await mg.messages.create(DOMAIN, data);
}

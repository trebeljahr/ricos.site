import formData from "form-data";
import Mailgun from "mailgun.js";
import { CreateUpdateMailListMembers } from "mailgun.js/interfaces/mailListMembers";

// @ts-ignore:next-line
const mailgun = new Mailgun(formData);

const DOMAIN = "newsletter.trebeljahr.com";
export const newsletterListMail = `test@${DOMAIN}`;

const mg = mailgun.client({
  username: "api",
  key: process.env.API_KEY || "",
  url: "https://api.eu.mailgun.net",
});

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

  if (existingLists.items.length !== 0) return;

  const newList = await mg.lists.create({
    address: newsletterListMail,
    name: "Trebeljahr's Newsletter List",
    description: "Default Newsletter List for newsletter.trebeljahr.com",
    access_level: "everyone", // readonly (default), members, everyone
  });

  console.log(newList);
}

export type Member = {
  email: string;
  name: string;
  vars: {
    hash: string;
  };
};

export async function addNewMemberToEmailList(newMember: Member) {
  const existingMember = await mg.lists.members.getMember(
    newsletterListMail,
    newMember.email
  );

  if (existingMember.subscribed) {
    console.log("Member already subscribed", newMember.email);
    return;
  }

  const member = await mg.lists.members.createMember(newsletterListMail, {
    address: newMember.email,
    name: newMember.name || "",
    vars: JSON.stringify(newMember.vars),
    subscribed: "no",
    upsert: "yes",
  });

  console.log(member);
}

export async function activateEmailListMember(email: string) {
  const newMember = await mg.lists.members.updateMember(
    newsletterListMail,
    email,
    {
      subscribed: "yes",
    } as unknown as CreateUpdateMailListMembers
  );

  console.log(newMember);
}

export async function sendEmail(data: EmailData) {
  await mg.messages.create(DOMAIN, data);
}

export async function sendToNewsletterList(data: EmailData) {
  data.to = newsletterListMail;
  await mg.messages.create(DOMAIN, data);
}

/**
 * The Mailgun newsletter backend, used only while a deployment is pinned
 * with NEWSLETTER_PROVIDER=mailgun (see src/lib/newsletter/subscribe.ts).
 * Delete this file when Mailgun is decommissioned.
 */
import "dotenv/config";
import formData from "form-data";
import Mailgun from "mailgun.js";

const mailgun = new Mailgun(formData);

const DOMAIN = "newsletter.trebeljahr.com";

export const newsletterListMail =
  process.env.NODE_ENV === "production" ? `hi@${DOMAIN}` : `test@${DOMAIN}`;

const createMgClient = () => {
  const mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY || "",
    url: "https://api.eu.mailgun.net",
  });

  return mg;
};

type EmailData = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type Member = {
  email: string;
  name: string;
  vars: {
    hash: string;
  };
};

export async function isAlreadySubscribed(email: string) {
  const mg = createMgClient();
  try {
    const existingMember = await mg.lists.members.getMember(newsletterListMail, email);
    return existingMember.subscribed;
  } catch (_err) {
    return false;
  }
}

export async function addNewMemberToEmailList(newMember: Member) {
  const mg = createMgClient();

  const _member = await mg.lists.members.createMember(newsletterListMail, {
    address: newMember.email,
    name: newMember.name || "",
    vars: JSON.stringify(newMember.vars),
    subscribed: "no",
    upsert: "yes",
  });
}

export async function activateEmailListMember(email: string) {
  const mg = createMgClient();

  const _newMember = await mg.lists.members.updateMember(newsletterListMail, email, {
    address: email,
    subscribed: "yes",
  });
}

export async function sendEmail(data: EmailData) {
  const mg = createMgClient();

  await mg.messages.create(DOMAIN, data);
}

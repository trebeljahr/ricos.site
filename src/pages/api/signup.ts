import { NextApiRequest, NextApiResponse } from "next";
import {
  addNewMemberToEmailList,
  isAlreadySubscribed,
  sendEmail,
} from "../../lib/mailgun";
import { getErrorMessage, getHash } from "../../lib/utils";
import { readFile } from "fs/promises";
import Handlebars from "handlebars";
import path from "path";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log("New signup:", req.body);

    const newMember = {
      email: req.body.email,
      name: req.body.name || "",
      vars: { hash: await getHash(req.body.email) },
    };

    if (await isAlreadySubscribed(newMember.email)) {
      console.log("Member already subscribed", newMember.email);
      return res.json({
        success: "You were already signed up to the newsletter.",
      });
    }

    await addNewMemberToEmailList(newMember);

    const HOST =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://trebeljahr.com";

    const confirmLink = `${HOST}/api/confirm-email?hash=${newMember.vars.hash}&email=${newMember.email}`;

    const emailHandlebarsFile = await readFile(
      path.join(process.cwd(), "email-templates", "confirmSubscription.hbs"),
      "utf-8"
    );
    const template = Handlebars.compile(emailHandlebarsFile);

    const placeholder = {
      confirmLink,
    };

    const htmlEmail = template(placeholder);

    const data = {
      from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
      to: newMember.email,
      subject: "Confirm Signup to Trebeljahr's Newsletter",
      html: htmlEmail,
      text: `You signed up for Trebeljahr's Newsletter. You can confirm your subscription by clicking this link ${confirmLink}`,
    };

    await sendEmail(data);

    res.json({
      success: "Now check your mail to confirm your subscription!",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "An error occured...",
      errorMessage: getErrorMessage(err),
    });
  }
}

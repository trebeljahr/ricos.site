import { NextApiRequest, NextApiResponse } from "next";
import { addNewMemberToEmailList, sendEmail } from "../../lib/mailgun";
import { getErrorMessage, getHash } from "../../lib/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log(req.body);

    const newMember = {
      email: req.body.email,
      name: req.body.name || "",
      vars: { hash: await getHash(req.body.email) },
    };
    await addNewMemberToEmailList(newMember);

    const HOST =
      process.env.NODE_ENV === "development"
        ? "http://localhost:3000"
        : "https://trebeljahr.com";
    const link = `${HOST}/api/confirm-email?hash=${newMember.vars.hash}&email=${newMember.email}`;
    const data = {
      from: "Rico Trebeljahr <rico@newsletter.trebeljahr.com>",
      to: newMember.email,
      subject: "Confirm Signup to Trebeljahr's Newsletter",
      html: `Please follow this link 
      <a href="${link}">${link}</a> 
      to confirm your newsletter subscription.`,
      text: `Please follow this link ${link} to confirm your newsletter subscription.`,
    };

    await sendEmail(data);

    res.json({
      success: "Signed up email for newsletter. Waiting for confirmation!",
    });
  } catch (err) {
    res.status(400).json({
      error: "An error occured...",
      errorMessage: getErrorMessage(err),
    });
  }
}

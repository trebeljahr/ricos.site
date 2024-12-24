import { NextApiRequest, NextApiResponse } from "next";
import { confirmEmail } from "src/lib/emailUtils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await confirmEmail(req, res);
    res.redirect("/email-signup-success");
  } catch (err) {
    res.redirect("/email-signup-error");
  }
}

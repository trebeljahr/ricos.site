import type { NextApiRequest, NextApiResponse } from "next";
import { confirmEmail } from "src/lib/emailUtils";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const confirmed = await confirmEmail(req.query.email, req.query.hash);
    res.redirect(confirmed ? "/email-signup-success" : "/email-signup-error");
  } catch (err) {
    console.error(err);
    res.redirect("/email-signup-error");
  }
}

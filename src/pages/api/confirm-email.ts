import type { NextApiRequest, NextApiResponse } from "next";
import { readConfirmLink } from "src/lib/newsletter/confirmLink";
import { confirmAddress } from "src/lib/newsletter/subscribe";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const link = await readConfirmLink(req.query);
    if (!link.ok) {
      console.info(
        JSON.stringify({ scope: "newsletter.confirm", event: "rejected", reason: link.reason }),
      );
      return res.redirect("/email-signup-error");
    }
    await confirmAddress(link.email, link.lists);
    res.redirect("/email-signup-success");
  } catch (err) {
    console.error(err);
    res.redirect("/email-signup-error");
  }
}

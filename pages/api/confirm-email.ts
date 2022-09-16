import { NextApiRequest, NextApiResponse } from "next";
import { confirmEmail, getErrorMessage } from "../../lib/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await confirmEmail(req, res);
    res.json({ success: "Confirmed email address for newsletter" });
  } catch (err) {
    res.status(400).json({
      error: "An error occured...",
      errorMessage: getErrorMessage(err),
    });
  }
}

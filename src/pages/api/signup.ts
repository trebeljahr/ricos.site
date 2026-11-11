import type { NextApiRequest, NextApiResponse } from "next";
import { parseListKeys } from "src/lib/newsletter/lists";
import { clientIp, processSignup } from "src/lib/newsletter/signupRequest";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // List keys only, never list ids (see src/lib/newsletter/lists.ts).
  const { status, body } = await processSignup(
    { ip: clientIp(req), body: req.body },
    parseListKeys(req.body?.lists),
  );
  res.status(status).json(body);
}

import type { NextApiRequest, NextApiResponse } from "next";
import { availableListKeys } from "src/lib/newsletter/lists";
import { isRicoOrigin } from "src/lib/newsletter/ricoOrigins";
import { processSignup } from "src/lib/newsletter/signupRequest";

/**
 * Signup for the announce list only, open to Rico's other sites. Post
 * `{ email, website }` as JSON (`website` is the honeypot, sent empty).
 * Browsers may call it only from the origins in ricoOrigins.ts; a request
 * with any other Origin is refused before anything is read. The answer
 * is `{ success }` or `{ error, errorMessage }`, like /api/signup.
 *
 * The subscriber record does not say which site the signup came from.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
  res.setHeader("Vary", "Origin");
  if (origin !== undefined) {
    if (!isRicoOrigin(origin, req.headers.host)) {
      return res.status(403).json({ error: "Origin not allowed" });
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!availableListKeys().includes("announce")) {
    return res.status(503).json({
      error: "List closed",
      errorMessage: "This list is not open yet. Please try again later.",
    });
  }

  const { status, body } = await processSignup(req, ["announce"]);
  res.status(status).json(body);
}

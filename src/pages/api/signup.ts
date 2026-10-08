import type { NextApiRequest, NextApiResponse } from "next";
import {
  availableListKeys,
  DEFAULT_LIST,
  listNames,
  parseListKeys,
} from "src/lib/newsletter/lists";
import {
  checkRateLimit,
  listsToConfirm,
  normalizeEmail,
  sendConfirmationEmail,
} from "src/lib/newsletter/subscribe";
import { getErrorMessage } from "../../lib/utils/misc";

function clientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (first) return first.split(",")[0].trim();
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real) return real;
  return req.socket.remoteAddress ?? "unknown";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkRateLimit(clientIp(req))) {
    return res.status(429).json({
      error: "Too many requests",
      errorMessage: "Too many signups from here. Please wait a minute.",
    });
  }

  // Honeypot: people never fill the hidden field, bots do. Answer like a
  // success so they learn nothing, and send nothing.
  if (typeof req.body?.website === "string" && req.body.website.trim()) {
    return res.json({ success: "Now check your mail to confirm your subscription!" });
  }

  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({
      error: "Invalid email",
      errorMessage: "Please enter a valid email address.",
    });
  }

  // List keys only, never list ids (see src/lib/newsletter/lists.ts).
  const lists = parseListKeys(req.body?.lists);
  const available = availableListKeys();
  if (!lists?.every((list) => available.includes(list))) {
    return res.status(400).json({
      error: "Invalid list",
      errorMessage: "Pick at least one of the lists on the form.",
    });
  }

  try {
    const pending = await listsToConfirm(email, lists);
    if (pending.length === 0) {
      return res.json({
        success:
          lists.length === 1 && lists[0] === DEFAULT_LIST
            ? "You were already signed up to the newsletter."
            : `You were already signed up to ${listNames(lists)}.`,
      });
    }

    await sendConfirmationEmail(email, pending);

    res.json({ success: "Now check your mail to confirm your subscription!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "An error occured...",
      errorMessage: getErrorMessage(err),
    });
  }
}

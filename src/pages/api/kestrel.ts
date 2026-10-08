import type { NextApiRequest, NextApiResponse } from "next";

/**
 * First-party Plausible event endpoint. Content blockers block requests to
 * plausible.trebeljahr.com, so the script (rewritten in next.config.mjs) posts
 * to /kestrel/k on this domain, which is rewritten to this route.
 *
 * A plain rewrite is not enough: plausible.trebeljahr.com sits behind
 * Cloudflare, which would report this server's IP to Plausible, so every
 * visitor would count as one and land in the same country. Plausible reads
 * X-Plausible-IP before CF-Connecting-IP, so the visitor's IP goes there.
 */
const PLAUSIBLE_EVENT_URL = "https://plausible.trebeljahr.com/api/event";

export const config = { api: { bodyParser: false } };

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Cloudflare sets CF-Connecting-IP in front of this site; X-Forwarded-For is the fallback. */
function visitorIp(req: NextApiRequest) {
  const cf = firstHeader(req.headers["cf-connecting-ip"])?.trim();
  if (cf) return cf;
  return firstHeader(req.headers["x-forwarded-for"])?.split(",")[0]?.trim() || undefined;
}

async function readBody(req: NextApiRequest) {
  const chunks: Buffer[] = [];
  for await (const chunk of req)
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const headers: Record<string, string> = {
    "Content-Type": firstHeader(req.headers["content-type"]) ?? "text/plain",
  };
  const userAgent = firstHeader(req.headers["user-agent"]);
  if (userAgent) headers["User-Agent"] = userAgent;
  const ip = visitorIp(req);
  if (ip) headers["X-Plausible-IP"] = ip;

  try {
    const upstream = await fetch(PLAUSIBLE_EVENT_URL, {
      method: "POST",
      headers,
      body: await readBody(req),
    });
    res.setHeader("Cache-Control", "no-store");
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    return res.status(upstream.status).send(await upstream.text());
  } catch (error) {
    console.error("Plausible event proxy failed", error);
    return res.status(502).json({ message: "Analytics upstream unavailable" });
  }
}

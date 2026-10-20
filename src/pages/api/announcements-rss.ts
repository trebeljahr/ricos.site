import type { NextApiRequest, NextApiResponse } from "next";
import { announcementsFeed } from "src/lib/announcementsFeed";

/**
 * /projects/rss.xml (a rewrite in next.config.mjs). Built per request, so
 * an entry dated ahead appears on its day without a deploy; the CDN keeps
 * each answer for up to an hour.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }
  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.status(200).send(announcementsFeed());
}

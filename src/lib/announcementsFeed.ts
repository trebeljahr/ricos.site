import { Feed } from "feed";
import {
  ANNOUNCEMENTS,
  ANNOUNCEMENTS_FEED_PATH,
  type Announcement,
  publishedAnnouncements,
} from "./announcements";
import { baseUrl } from "./urlUtils";

/**
 * RSS 2.0 for the published entries. Server only, so the `feed` package
 * stays out of page bundles.
 */
export function announcementsFeed(
  entries: Announcement[] = ANNOUNCEMENTS,
  now: Date = new Date(),
  site: string = baseUrl,
): string {
  const items = publishedAnnouncements(entries, now);
  const feed = new Feed({
    title: "New things from Rico",
    description: "One item each time Rico Trebeljahr puts out a new game, tool or explorable.",
    id: `${site}/projects`,
    link: `${site}/projects`,
    language: "en",
    favicon: `${site}/favicon/favicon.ico`,
    copyright: `All rights reserved ${now.getUTCFullYear()}, Rico Trebeljahr`,
    generator: "ricos.site",
    updated: items[0]?.date ?? now,
    feedLinks: { rss: `${site}${ANNOUNCEMENTS_FEED_PATH}` },
    author: { name: "Rico Trebeljahr", link: site },
  });
  for (const item of items) {
    feed.addItem({
      title: item.title,
      id: `${site}/projects#${item.slug}-${item.date.toISOString().slice(0, 10)}`,
      link: item.link,
      description: item.summary,
      date: item.date,
    });
  }
  return feed.rss2();
}

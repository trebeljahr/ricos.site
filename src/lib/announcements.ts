import { PROJECTS } from "src/lib/projects";

/**
 * "A new thing is out": one entry per thing that goes to the announce
 * list. The same entry feeds /projects/rss.xml (./announcementsFeed.ts)
 * and `pnpm newsletter:announce <slug>`, which drafts the email.
 *
 * An entry names a project from src/lib/projects.ts and takes its title,
 * card text and link unless it overrides them. It stays out of the feed
 * until `date` (an ISO date, or date and time in UTC) has passed, so an
 * entry can be added before launch day.
 */
export type Announcement = {
  /** A slug from PROJECTS. */
  slug: string;
  /** When the thing is out: "2026-10-27" or "2026-10-27T16:00:00Z". */
  date: string;
  title?: string;
  summary?: string;
  link?: string;
};

export const ANNOUNCEMENTS: Announcement[] = [
  // D0 of the conv3D launch, the Show HN slot (vault: conv3d-launch-checklist).
  { slug: "conv3d", date: "2026-10-27T16:00:00Z" },
];

export type ResolvedAnnouncement = {
  slug: string;
  date: Date;
  title: string;
  summary: string;
  link: string;
};

export function resolveAnnouncement(entry: Announcement): ResolvedAnnouncement {
  const project = PROJECTS.find((p) => p.slug === entry.slug);
  if (!project) throw new Error(`Announcement "${entry.slug}" names no project in PROJECTS.`);
  const date = new Date(entry.date);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Announcement "${entry.slug}" has an invalid date: ${entry.date}`);
  }
  return {
    slug: entry.slug,
    date,
    title: entry.title ?? project.title,
    summary: entry.summary ?? project.subtitle,
    link: entry.link ?? project.link,
  };
}

/** Entries whose date has passed, newest first. */
export function publishedAnnouncements(
  entries: Announcement[] = ANNOUNCEMENTS,
  now: Date = new Date(),
): ResolvedAnnouncement[] {
  return entries
    .map(resolveAnnouncement)
    .filter((a) => a.date.getTime() <= now.getTime())
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export const ANNOUNCEMENTS_FEED_PATH = "/projects/rss.xml";

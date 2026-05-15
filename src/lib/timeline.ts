import type { CommonMetadata } from "src/@types";

export type TimelineEntryType =
  | "essay"
  | "newsletter"
  | "travel"
  | "booknote"
  | "podcast"
  | "page"
  | "photography"
  | "r3f";

export type TimelineEntry = {
  id: string;
  title: string;
  href: string;
  type: TimelineEntryType;
  typeLabel: string;
  date?: string;
  datePrecision?: "day" | "month" | "year";
  dateLabel?: string;
  excerpt?: string;
  readingTime?: number;
  wordCount?: number;
};

export type TimelineStats = {
  count: number;
  readingTime: number;
  wordCount: number;
  typeCounts: Partial<Record<TimelineEntryType, number>>;
};

export type TimelineYearSection = {
  year: string;
  stats: TimelineStats;
  items: TimelineEntry[];
};

export const timelineTypeLabels: Record<TimelineEntryType, string> = {
  essay: "Essays",
  newsletter: "Newsletters",
  travel: "Travel",
  booknote: "Booknotes",
  podcast: "Podcast notes",
  page: "Pages",
  photography: "Photography",
  r3f: "R3F",
};

const contentTypeMap: Record<string, { type: TimelineEntryType; label: string }> = {
  Post: { type: "essay", label: "Essay" },
  Newsletter: { type: "newsletter", label: "Newsletter" },
  Travelblog: { type: "travel", label: "Travel story" },
  Booknote: { type: "booknote", label: "Book note" },
  Podcastnote: { type: "podcast", label: "Podcast note" },
  Page: { type: "page", label: "Page" },
};

export function toTimelineEntries(
  documents: CommonMetadata[],
  contentType: keyof typeof contentTypeMap,
): TimelineEntry[] {
  const { type, label } = contentTypeMap[contentType];

  return documents.map((document) => ({
    id: `${contentType}:${document.link || document.slug}`,
    title:
      contentType === "Booknote" && document.bookAuthor
        ? `${document.title} by ${document.bookAuthor}`
        : document.title,
    href: document.link,
    type,
    typeLabel: label,
    date: document.date,
    datePrecision: "day",
    excerpt: document.excerpt || document.metaDescription,
    readingTime: document.metadata?.readingTime,
    wordCount: document.metadata?.wordCount,
  }));
}

export function sortTimelineEntries(entries: TimelineEntry[]) {
  return [...entries].sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

export function getTimelineYear(entry: TimelineEntry) {
  if (!entry.date) return "Needs dates";
  return String(new Date(`${entry.date}T00:00:00Z`).getUTCFullYear());
}

export function summarizeTimelineEntries(entries: TimelineEntry[]): TimelineStats {
  return entries.reduce<TimelineStats>(
    (stats, entry) => {
      stats.count += 1;
      stats.readingTime += entry.readingTime || 0;
      stats.wordCount += entry.wordCount || 0;
      stats.typeCounts[entry.type] = (stats.typeCounts[entry.type] || 0) + 1;
      return stats;
    },
    { count: 0, readingTime: 0, wordCount: 0, typeCounts: {} },
  );
}

export function groupTimelineEntries(entries: TimelineEntry[]): TimelineYearSection[] {
  const groups = new Map<string, TimelineEntry[]>();

  for (const entry of sortTimelineEntries(entries)) {
    const year = getTimelineYear(entry);
    groups.set(year, [...(groups.get(year) || []), entry]);
  }

  return Array.from(groups.entries()).map(([year, items]) => ({
    year,
    items,
    stats: summarizeTimelineEntries(items),
  }));
}

export function formatTimelineDate(entry: TimelineEntry) {
  if (!entry.date) return "Date needed";
  if (entry.dateLabel) return entry.dateLabel;
  if (entry.datePrecision === "year") return getTimelineYear(entry);
  if (entry.datePrecision === "month") {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${entry.date}T00:00:00Z`));
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${entry.date}T00:00:00Z`));
}

export function toSerializableTimelineEntries(entries: TimelineEntry[]) {
  return entries.map(
    (entry) =>
      Object.fromEntries(
        Object.entries(entry).filter(([, value]) => value !== undefined),
      ) as TimelineEntry,
  );
}

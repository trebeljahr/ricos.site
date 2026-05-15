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

export type TimelineCover = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type TimelineEntry = {
  id: string;
  title: string;
  href: string;
  type: TimelineEntryType;
  typeLabel: string;
  date?: string;
  datePrecision?: "day" | "month" | "year";
  excerpt?: string;
  readingTime?: number;
  wordCount?: number;
  cover?: TimelineCover;
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

const contentTimeZone = "Europe/Berlin";
const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const datePartFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "2-digit",
  timeZone: contentTimeZone,
  year: "numeric",
});

const contentTypeMap: Record<string, { type: TimelineEntryType; label: string }> = {
  Post: { type: "essay", label: "Essay" },
  Newsletter: { type: "newsletter", label: "Newsletter" },
  Travelblog: { type: "travel", label: "Travel story" },
  Booknote: { type: "booknote", label: "Book note" },
  Podcastnote: { type: "podcast", label: "Podcast note" },
  Page: { type: "page", label: "Page" },
};

function datePartsToDateOnly(parts: Intl.DateTimeFormatPart[]) {
  const partMap = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (!partMap.year || !partMap.month || !partMap.day) return undefined;
  return `${partMap.year}-${partMap.month}-${partMap.day}`;
}

function toUtcDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return undefined;
  }

  return date;
}

function normalizeTimelineDate(date?: string) {
  const value = date?.trim();
  if (!value) return undefined;
  if (dateOnlyPattern.test(value)) return value;

  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return undefined;

  return datePartsToDateOnly(datePartFormatter.formatToParts(parsed));
}

function getTimelineUtcDate(entry: TimelineEntry) {
  const date = normalizeTimelineDate(entry.date);
  if (!date) return undefined;

  const match = date.match(dateOnlyPattern);
  if (!match) return undefined;

  const [, year, month, day] = match;
  return toUtcDate(Number(year), Number(month), Number(day));
}

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
    cover: document.cover,
  }));
}

export function sortTimelineEntries(entries: TimelineEntry[]) {
  return [...entries].sort((a, b) => {
    const aTime = getTimelineUtcDate(a)?.getTime();
    const bTime = getTimelineUtcDate(b)?.getTime();
    if (aTime === undefined && bTime === undefined) return a.title.localeCompare(b.title);
    if (aTime === undefined) return 1;
    if (bTime === undefined) return -1;
    return bTime - aTime;
  });
}

export function getTimelineYear(entry: TimelineEntry) {
  const date = getTimelineUtcDate(entry);
  if (!date) return "Needs dates";
  return String(date.getUTCFullYear());
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
  const date = getTimelineUtcDate(entry);
  if (!date) return "Date needed";
  if (entry.datePrecision === "year") return getTimelineYear(entry);
  if (entry.datePrecision === "month") {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function toSerializableTimelineEntries(entries: TimelineEntry[]) {
  return entries.map(
    (entry) =>
      Object.fromEntries(
        Object.entries(entry).filter(([, value]) => value !== undefined),
      ) as TimelineEntry,
  );
}

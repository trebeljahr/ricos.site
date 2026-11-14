import matter from "gray-matter";

/**
 * The work-in-progress log behind /workshop. Rico writes it in Obsidian as one
 * Markdown file; every word on the page comes from there. Each entry starts
 * with a level-two heading that begins with its ISO date:
 *
 *   ## 2026-11-14
 *   ## 2026-11-15 Optional entry title
 *
 * Text before the first dated heading, and headings without a date, are not
 * entries and do not show on the page.
 */
export const WORKSHOP_LOG_FILE = "src/content/Notes/texts/workshop.md";

export type WorkshopEntry = {
  /** ISO date, also the entry's anchor id. */
  date: string;
  /** The heading text after the date, if any. */
  title: string;
  markdown: string;
};

export type WorkshopLog = {
  title: string;
  subtitle: string;
  published: boolean;
  entries: WorkshopEntry[];
};

const ENTRY_HEADING = /^##[ \t]+(\d{4}-\d{2}-\d{2})\b[ \t]*(.*)$/;
const ANY_H2 = /^##[ \t]/;
const FENCE = /^(```|~~~)/;

const isRealDate = (iso: string) => {
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso);
};

export function parseWorkshopLog(source: string): WorkshopLog {
  const { data, content } = matter(source);
  const entries: WorkshopEntry[] = [];
  let current: { date: string; title: string; lines: string[] } | null = null;
  let inFence = false;

  const flush = () => {
    if (!current) return;
    entries.push({
      date: current.date,
      title: current.title,
      markdown: current.lines.join("\n").trim(),
    });
    current = null;
  };

  for (const line of content.split(/\r?\n/)) {
    if (FENCE.test(line.trim())) inFence = !inFence;
    const heading = inFence ? null : line.match(ENTRY_HEADING);
    if (heading && isRealDate(heading[1])) {
      flush();
      current = { date: heading[1], title: heading[2].replace(/^[-–—:\s]+/, "").trim(), lines: [] };
    } else if (!inFence && ANY_H2.test(line)) {
      flush();
    } else {
      current?.lines.push(line);
    }
  }
  flush();

  // Newest first; entries written on the same day keep the file's order.
  const ordered = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || a.index - b.index)
    .map(({ entry }) => entry);

  return {
    title: typeof data.title === "string" ? data.title : "",
    subtitle: typeof data.subtitle === "string" ? data.subtitle : "",
    published: data.published === true,
    entries: ordered,
  };
}

/** "14 November 2026", formatted on the server so both renders match. */
export function formatEntryDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

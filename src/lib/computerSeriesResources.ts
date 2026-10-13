// The study plan behind the "how computers work" series: what to read and
// watch before writing a chapter. src/content/computer/resources.json holds one
// catalog of resources (title, address, kind, author, length, where it came
// from) and, per chapter slug, which of them to study first and which go
// deeper. Chapters are keyed by slug, so renumbering a chapter changes nothing
// here. Pure functions only; /dev/writing and pnpm computer:resources read the
// file.
//
// A resource's own fields are plain metadata, fit for a "further reading" list
// on a chapter page. The notes on a link and the questions are study aids for
// the writer and are not reader copy.

export const RESOURCE_KINDS = [
  "video",
  "article",
  "book",
  "paper",
  "reference",
  "interactive",
  "course",
  "tool",
  "code",
] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

/** Where a resource was found: Rico's bookmarks and tabs, a channel he follows, or added to fill a gap. */
export const RESOURCE_ORIGINS = [
  "bookmark",
  "still-to-read",
  "compilers-folder",
  "tab",
  "channel",
  "added",
] as const;
export type ResourceOrigin = (typeof RESOURCE_ORIGINS)[number];

export type Resource = {
  title: string;
  /** Missing when only a title is known, such as a file or a tab whose address was not captured. */
  url?: string;
  kind: ResourceKind;
  by?: string;
  /** Running time of a video. */
  minutes?: number;
  origin: ResourceOrigin;
};

export type StudyLink = { id: string; note?: string };

export type ChapterStudy = {
  /** Do these before writing, in this order. */
  core: StudyLink[];
  /** For when a question below will not come out, or for curiosity. */
  deeper: StudyLink[];
  /** A question that cannot be answered cold marks the missing piece. */
  questions: string[];
  note?: string;
};

export type Catalog = {
  resources: Record<string, Resource>;
  /** By chapter slug. */
  chapters: Record<string, ChapterStudy>;
};

/** Resource id to the day it was studied (YYYY-MM-DD). */
export type StudyDone = Record<string, string>;

export type StudyItem = Resource & { id: string; note?: string; done?: string };

export type StudyPlan = {
  core: StudyItem[];
  deeper: StudyItem[];
  questions: string[];
  note?: string;
  coreDone: number;
  /** Video minutes among the core items not yet done. */
  minutesLeft: number;
};

function resolve(links: StudyLink[], catalog: Catalog): StudyItem[] {
  return links.flatMap((link) => {
    const resource = catalog.resources[link.id];
    if (!resource) return [];
    return [{ ...resource, id: link.id, ...(link.note ? { note: link.note } : {}) }];
  });
}

/** The same plan with today's ticks: which items are done, and what is left of the core. */
export function withDone(plan: StudyPlan, done: StudyDone): StudyPlan {
  const mark = ({ done: _was, ...item }: StudyItem): StudyItem =>
    done[item.id] ? { ...item, done: done[item.id] } : item;
  const core = plan.core.map(mark);
  const open = core.filter((item) => !item.done);
  return {
    ...plan,
    core,
    deeper: plan.deeper.map(mark),
    coreDone: core.length - open.length,
    minutesLeft: open.reduce((sum, item) => sum + (item.minutes ?? 0), 0),
  };
}

/** A chapter's study list with its resources filled in, or null when it has none. */
export function studyPlan(
  slug: string | undefined,
  catalog: Catalog,
  done: StudyDone = {},
): StudyPlan | null {
  const study = slug ? catalog.chapters[slug] : undefined;
  if (!study) return null;
  const core = resolve(study.core, catalog);
  const deeper = resolve(study.deeper, catalog);
  if (core.length + deeper.length + study.questions.length === 0) return null;
  return withDone(
    {
      core,
      deeper,
      questions: study.questions,
      ...(study.note ? { note: study.note } : {}),
      coreDone: 0,
      minutesLeft: 0,
    },
    done,
  );
}

/**
 * A chapter's resources without the study notes: what a chapter page can list
 * as further reading. Core first, each resource once, only those with an address.
 */
export function furtherReading(slug: string, catalog: Catalog): (Resource & { id: string })[] {
  const study = catalog.chapters[slug];
  if (!study) return [];
  const seen = new Set<string>();
  return [...study.core, ...study.deeper].flatMap(({ id }) => {
    const resource = catalog.resources[id];
    if (!resource?.url || seen.has(id)) return [];
    seen.add(id);
    return [{ ...resource, id }];
  });
}

/** Marks a resource studied today, or clears the mark. Returns a new record. */
export function setStudied(done: StudyDone, id: string, studied: boolean, today: string) {
  const next = { ...done };
  if (studied) next[id] = next[id] ?? today;
  else delete next[id];
  return next;
}

/** "1 h 05 min", "16 min". */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} h ${String(rest).padStart(2, "0")} min` : `${rest} min`;
}

/** What goes wrong in a catalog, one line each: nothing should make it to main. */
export function checkCatalog(catalog: Catalog, chapterSlugs: string[]): string[] {
  const problems: string[] = [];
  const used = new Set<string>();
  const urls = new Map<string, string>();
  for (const [id, resource] of Object.entries(catalog.resources)) {
    if (!resource.title.trim()) problems.push(`resource ${id}: no title`);
    if (!RESOURCE_KINDS.includes(resource.kind))
      problems.push(`resource ${id}: unknown kind "${resource.kind}"`);
    if (!RESOURCE_ORIGINS.includes(resource.origin))
      problems.push(`resource ${id}: unknown origin "${resource.origin}"`);
    if (resource.url) {
      const twin = urls.get(resource.url);
      if (twin) problems.push(`resources ${twin} and ${id}: same address`);
      urls.set(resource.url, id);
    }
  }
  const known = new Set(chapterSlugs);
  for (const [slug, study] of Object.entries(catalog.chapters)) {
    if (!known.has(slug)) problems.push(`chapter ${slug}: no chapter file has this slug`);
    const inChapter = new Set<string>();
    for (const { id } of [...study.core, ...study.deeper]) {
      if (!catalog.resources[id]) problems.push(`chapter ${slug}: unknown resource ${id}`);
      if (inChapter.has(id)) problems.push(`chapter ${slug}: ${id} listed twice`);
      inChapter.add(id);
      used.add(id);
    }
  }
  for (const slug of chapterSlugs) {
    if (!catalog.chapters[slug]) problems.push(`chapter ${slug}: no study list`);
  }
  for (const id of Object.keys(catalog.resources)) {
    if (!used.has(id)) problems.push(`resource ${id}: not used by any chapter`);
  }
  return problems;
}

const ORIGIN_MARK: Record<ResourceOrigin, string> = {
  bookmark: "🔖",
  "still-to-read": "📚",
  "compilers-folder": "🗂",
  tab: "🪟",
  channel: "📺",
  added: "➕",
};

function itemLine(item: StudyItem): string {
  const title = item.title.replace(/\|/g, "·").replace(/\[/g, "(").replace(/\]/g, ")");
  const head = item.url ? `[${title}](${item.url})` : title;
  const meta = [item.by, item.minutes ? formatMinutes(item.minutes) : undefined].filter(Boolean);
  return `- ${ORIGIN_MARK[item.origin]} ${[head, ...meta].join(" · ")}${item.note ? ` — ${item.note}` : ""}`;
}

export type ChapterRef = { number: string; title: string; slug?: string; partTitle: string };

/** The study lists as Markdown, one section per chapter in the order given. */
export function studyMarkdown(chapters: ChapterRef[], catalog: Catalog): string {
  const out: string[] = [];
  let part = "";
  for (const chapter of chapters) {
    const plan = studyPlan(chapter.slug, catalog);
    if (!plan) continue;
    if (chapter.partTitle !== part) {
      part = chapter.partTitle;
      out.push(`## ${part}`, "");
    }
    out.push(`### ${chapter.number} ${chapter.title}`, "");
    const minutes = plan.core.reduce((sum, item) => sum + (item.minutes ?? 0), 0);
    if (minutes) out.push(`Core video time: ${formatMinutes(minutes)}.`, "");
    if (plan.note) out.push(`> ${plan.note}`, "");
    if (plan.core.length) out.push("**Core, before writing**", "", ...plan.core.map(itemLine), "");
    if (plan.deeper.length)
      out.push("**Deeper, if stuck or curious**", "", ...plan.deeper.map(itemLine), "");
    if (plan.questions.length)
      out.push(
        "**Can you answer these without looking?**",
        "",
        ...plan.questions.map((q) => `- ${q}`),
        "",
      );
  }
  return `${out.join("\n").trimEnd()}\n`;
}

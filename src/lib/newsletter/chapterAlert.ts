import { baseUrl } from "src/lib/urlUtils";
import { escapeGoTemplate } from "./listmonk";

/**
 * The "new chapter" email for the How computers work list: one short mail
 * per published chapter, built from its entry in
 * .velite/computerChapters.json. `pnpm newsletter:chapter <slug>` turns it
 * into a ListMonk draft; starting the draft stays a click in the admin UI.
 */

/** The fields of a velite `computerChapters` entry this email reads. */
export type ChapterEntry = {
  slug: string;
  title: string;
  summary?: string;
  published: boolean;
};

export function findPublishedChapter(chapters: ChapterEntry[], slug: string): ChapterEntry {
  const chapter = chapters.find((entry) => entry.slug === slug);
  if (!chapter) {
    const known = chapters.filter((entry) => entry.published).map((entry) => entry.slug);
    throw new Error(
      `No chapter with slug "${slug}". Published: ${known.length > 0 ? known.join(", ") : "none"}.`,
    );
  }
  if (!chapter.published) {
    throw new Error(`Chapter "${slug}" is not published yet; set published: true first.`);
  }
  return chapter;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type ChapterAlertEmail = { name: string; subject: string; html: string; text: string };

// No braces, so the Go-template quoting leaves it alone.
const UNSUBSCRIBE = "__CHAPTER_ALERT_UNSUBSCRIBE_URL__";

/** Quote every `{{` the chapter brought along, then make the unsubscribe link live. */
function finalize(template: string): string {
  return escapeGoTemplate(template).replaceAll(UNSUBSCRIBE, "{{ UnsubscribeURL }}");
}

/**
 * `subject`, `html` and `text` are ListMonk Go templates. Only
 * `{{ UnsubscribeURL }}` is live; braces from the chapter are quoted.
 */
export function chapterAlertEmail(
  chapter: ChapterEntry,
  site: string = baseUrl,
): ChapterAlertEmail {
  const url = `${site}/computer/${chapter.slug}`;
  const { title } = chapter;
  const summary = chapter.summary?.trim() ?? "";

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;font-family:sans-serif;font-size:16px;line-height:1.6;color:#222222;">
<div style="max-width:560px;margin:0 auto;">
<p style="margin:0 0 16px;color:#666666;">A new chapter of How computers work is up.</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;">${escapeHtml(title)}</h1>
${summary ? `<p style="margin:0 0 24px;">${escapeHtml(summary)}</p>\n` : ""}<p style="margin:0 0 32px;"><a href="${escapeHtml(url)}" style="color:#0f766e;">Read the chapter</a></p>
<p style="margin:0;font-size:13px;color:#888888;">You get this because you signed up for new chapters of How computers work. <a href="${UNSUBSCRIBE}" style="color:#888888;">Unsubscribe</a>.</p>
</div>
</body>
</html>
`;

  const text = [
    "A new chapter of How computers work is up.",
    "",
    title,
    ...(summary ? ["", summary] : []),
    "",
    `Read the chapter: ${url}`,
    "",
    `Unsubscribe: ${UNSUBSCRIBE}`,
    "",
  ].join("\n");

  return {
    name: `How computers work: ${chapter.slug}`,
    subject: escapeGoTemplate(`New chapter: ${title}`),
    html: finalize(html),
    text: finalize(text),
  };
}

import type { ResolvedAnnouncement } from "src/lib/announcements";
import { escapeGoTemplate } from "./listmonk";

/**
 * The "a new thing is out" email for the announce list, built from an
 * entry in src/lib/announcements.ts. `pnpm newsletter:announce <slug>`
 * turns it into a ListMonk draft; starting the draft stays a click in the
 * admin UI, after Rico has read and edited it.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type AnnounceEmail = { name: string; subject: string; html: string; text: string };

// No braces, so the Go-template quoting leaves it alone.
const UNSUBSCRIBE = "__ANNOUNCE_UNSUBSCRIBE_URL__";

function finalize(template: string): string {
  return escapeGoTemplate(template).replaceAll(UNSUBSCRIBE, "{{ UnsubscribeURL }}");
}

/**
 * `subject`, `html` and `text` are ListMonk Go templates. Only
 * `{{ UnsubscribeURL }}` is live; braces from the entry are quoted.
 */
export function announceEmail(entry: ResolvedAnnouncement): AnnounceEmail {
  const { title, summary, link } = entry;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px;font-family:sans-serif;font-size:16px;line-height:1.6;color:#222222;">
<div style="max-width:560px;margin:0 auto;">
<p style="margin:0 0 16px;color:#666666;">A new thing is out.</p>
<h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;">${escapeHtml(title)}</h1>
<p style="margin:0 0 24px;">${escapeHtml(summary)}</p>
<p style="margin:0 0 32px;"><a href="${escapeHtml(link)}" style="color:#0f766e;">${escapeHtml(link.replace(/^https?:\/\//, ""))}</a></p>
<p style="margin:0;font-size:13px;color:#888888;">You get this because you asked for one email each time a new thing is out on ricos.site. <a href="${UNSUBSCRIBE}" style="color:#888888;">Unsubscribe</a>.</p>
</div>
</body>
</html>
`;

  const text = [
    "A new thing is out.",
    "",
    title,
    "",
    summary,
    "",
    link,
    "",
    `Unsubscribe: ${UNSUBSCRIBE}`,
    "",
  ].join("\n");

  return {
    name: `New thing: ${entry.slug}`,
    subject: escapeGoTemplate(`New: ${title}`),
    html: finalize(html),
    text: finalize(text),
  };
}

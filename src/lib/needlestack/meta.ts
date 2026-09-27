/**
 * What a page says about itself, and how to get it out of the HTML.
 *
 * Triage is much faster with a thumbnail, a site name and a description than
 * with a bookmark title alone — half the YouTube titles in the export are
 * things like "(32) Answering Your Questions". This module is the pure half:
 * given HTML (or a YouTube oEmbed payload), what do we know about the page.
 * The fetching, rate limiting and writing live in src/scripts/needles/fetch.ts.
 *
 * Everything is best-effort. A missing field is normal; a wrong field is not,
 * so anything ambiguous is left undefined rather than guessed.
 */

export type NeedleMeta = {
  /** ISO timestamp of the last fetch attempt. */
  fetchedAt: string;
  ok: boolean;
  httpStatus?: number;
  /** Gone for good (404, 410, no such host). Soft failures are not dead. */
  dead?: boolean;
  error?: string;
  attempts?: number;

  siteName?: string;
  title?: string;
  description?: string;
  author?: string;
  /** ISO date the page claims it was published. */
  publishedAt?: string;
  image?: string;
  imageAlt?: string;
  favicon?: string;
  lang?: string;
  /** og:type, or the media type for a non-HTML link. */
  ogType?: string;
  canonical?: string;

  /** Video or audio length, when the page states one. */
  durationSeconds?: number;
  /** Word count of the article body, for the reading-time estimate. */
  words?: number;
};

export const WORDS_PER_MINUTE = 220;

const decodeEntities = (text: string): string =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&(#39|apos|rsquo);/g, "'")
    .replace(/&nbsp;/g, " ");

const clean = (text: string | undefined, max = 500): string | undefined => {
  if (!text) return undefined;
  const value = decodeEntities(text).replace(/\s+/g, " ").trim();
  return value.length > 0 ? value.slice(0, max) : undefined;
};

/**
 * Meta tags are written in every attribute order there is, so the tag is found
 * first and its attributes read afterwards.
 */
function metaContent(
  html: string,
  key: string,
  attribute: "property" | "name",
): string | undefined {
  const pattern = new RegExp(
    `<meta\\b[^>]*\\b${attribute}\\s*=\\s*["']${key}["'][^>]*>|<meta\\b[^>]*>`,
    "gi",
  );
  for (const match of html.matchAll(pattern)) {
    const tag = match[0];
    const keyMatch = new RegExp(`\\b${attribute}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag);
    if (!keyMatch || keyMatch[1].toLowerCase() !== key.toLowerCase()) continue;
    const content = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(tag);
    if (content) return clean(content[1]);
  }
  return undefined;
}

/** First of these keys that any page states, as `property` or as `name`. */
const firstMeta = (html: string, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = metaContent(html, key, "property") ?? metaContent(html, key, "name");
    if (value) return value;
  }
  return undefined;
};

/** "PT1H2M10S" (ISO 8601) or "1:02:10" or plain seconds. */
export function parseDuration(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return value > 0 ? Math.round(value) : undefined;
  const text = value.trim();
  if (/^\d+$/.test(text)) return Number(text) || undefined;

  const iso = /^P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/i.exec(text);
  if (iso) {
    const seconds =
      Number(iso[1] ?? 0) * 3600 + Number(iso[2] ?? 0) * 60 + Math.round(Number(iso[3] ?? 0));
    return seconds > 0 ? seconds : undefined;
  }

  const clock = text.split(":").map(Number);
  if (clock.length >= 2 && clock.every((part) => Number.isFinite(part))) {
    const seconds = clock.reduce((total, part) => total * 60 + part, 0);
    return seconds > 0 ? Math.round(seconds) : undefined;
  }
  return undefined;
}

/** Strips scripts, tags and boilerplate so the word count means something. */
export function bodyText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|head|nav|footer|header|form)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type JsonLdNode = Record<string, unknown>;

/** Flattens every JSON-LD block, including @graph, into one list of nodes. */
function jsonLdNodes(html: string): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];
  const pattern =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(pattern)) {
    try {
      const parsed: unknown = JSON.parse(match[1].trim());
      const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length > 0) {
        const node = queue.shift();
        if (!node || typeof node !== "object") continue;
        const record = node as JsonLdNode;
        if (Array.isArray(record["@graph"])) queue.push(...(record["@graph"] as unknown[]));
        nodes.push(record);
      }
    } catch {
      // Sites ship broken JSON-LD all the time; it is a bonus, not a source.
    }
  }
  return nodes;
}

function jsonLdAuthor(node: JsonLdNode): string | undefined {
  const author = node.author ?? node.creator;
  if (typeof author === "string") return clean(author, 120);
  if (Array.isArray(author)) {
    const names = author
      .map((entry) =>
        typeof entry === "string" ? entry : ((entry as JsonLdNode)?.name as string | undefined),
      )
      .filter((name): name is string => typeof name === "string");
    return clean(names.join(", "), 120);
  }
  if (author && typeof author === "object")
    return clean((author as JsonLdNode).name as string | undefined, 120);
  return undefined;
}

const absolute = (value: string | undefined, base: string): string | undefined => {
  if (!value) return undefined;
  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
};

/** The favicon a page declares, else the host's conventional one. */
export function faviconFrom(html: string, base: string): string | undefined {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const rel = /\brel\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (!rel || !/\b(icon|shortcut icon|apple-touch-icon)\b/.test(rel)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const resolved = absolute(href, base);
    if (resolved) return resolved;
  }
  return absolute("/favicon.ico", base);
}

/**
 * Everything worth keeping from one HTML page.
 *
 * `url` is the URL the response came from, so relative images and icons
 * resolve against the page that actually served them, not the bookmark.
 */
export function metaFromHtml(html: string, url: string): Partial<NeedleMeta> {
  const meta: Partial<NeedleMeta> = {};

  meta.title =
    firstMeta(html, ["og:title", "twitter:title"]) ??
    clean(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1], 300);
  meta.description = firstMeta(html, ["og:description", "twitter:description", "description"]);
  meta.siteName = firstMeta(html, ["og:site_name", "application-name"]);
  meta.author = firstMeta(html, ["author", "article:author", "twitter:creator"]);
  meta.ogType = firstMeta(html, ["og:type"]);
  meta.image = absolute(
    firstMeta(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"]),
    url,
  );
  meta.imageAlt = firstMeta(html, ["og:image:alt", "twitter:image:alt"]);
  meta.publishedAt = firstMeta(html, [
    "article:published_time",
    "og:article:published_time",
    "date",
    "datePublished",
  ]);
  meta.lang = clean(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i.exec(html)?.[1], 12);
  meta.canonical = absolute(
    /<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*\bhref\s*=\s*["']([^"']+)["']/i.exec(html)?.[1],
    url,
  );
  meta.favicon = faviconFrom(html, url);

  // YouTube keeps the length in the player payload rather than in a meta tag.
  meta.durationSeconds =
    parseDuration(/"lengthSeconds"\s*:\s*"?(\d+)"?/.exec(html)?.[1]) ??
    parseDuration(firstMeta(html, ["video:duration", "duration", "og:video:duration"]));

  for (const node of jsonLdNodes(html)) {
    meta.durationSeconds ??= parseDuration(node.duration as string | undefined);
    meta.publishedAt ??= clean((node.datePublished ?? node.uploadDate) as string | undefined, 40);
    meta.author ??= jsonLdAuthor(node);
    meta.description ??= clean(node.description as string | undefined);
  }

  const text = bodyText(html);
  if (text.length > 0) meta.words = text.split(" ").length;

  // Drop the keys that came back undefined so the stored JSON stays small.
  for (const key of Object.keys(meta) as (keyof NeedleMeta)[]) {
    if (meta[key] === undefined) delete meta[key];
  }
  return meta;
}

/** Minutes a reader should budget: real length first, word count second. */
export function minutesFrom(meta: Partial<NeedleMeta>): number | undefined {
  if (meta.durationSeconds && meta.durationSeconds > 0)
    return Math.max(1, Math.round(meta.durationSeconds / 60));
  // Below ~300 words the page is a stub, a login wall or a link list, and a
  // "1 min" badge on it would be a lie dressed as data.
  if (meta.words && meta.words > 300) return Math.max(1, Math.round(meta.words / WORDS_PER_MINUTE));
  return undefined;
}

const NOISE_PATTERNS: RegExp[] = [
  /^\(\d+\)\s*/, // "(32) " — the unread-notification count in a copied tab title
  /\s*[-–|]\s*YouTube\s*$/i,
  /\s*on Vimeo\s*$/i,
  /\s*\|\s*Hacker News\s*$/i,
  /\s*-\s*Wikipedia\s*$/i,
];

/**
 * Bookmark titles are whatever the tab said when it was saved. The page's own
 * title is usually better, and the noise is mechanical enough to strip.
 */
export function cleanTitle(title: string | undefined): string | undefined {
  if (!title) return undefined;
  let value = decodeEntities(title).replace(/\s+/g, " ").trim();
  for (const pattern of NOISE_PATTERNS) value = value.replace(pattern, "").trim();
  return value.length > 0 ? value.slice(0, 300) : undefined;
}

/** The label a card shows for where a link goes ("youtube.com", "fs.blog"). */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * YouTube serves its thumbnails at a fixed path, so the picture costs nothing
 * even when the watch page itself refuses to be scraped.
 */
export function youtubeThumbnail(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("youtube.com")) return undefined;
    const id = parsed.searchParams.get("v");
    if (id && /^[\w-]{6,20}$/.test(id)) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * URL handling for the needlestack importer.
 *
 * Bookmark exports are messy: the same video appears as youtu.be, with a `si=`
 * share token, with a timestamp, and again through music.youtube.com. Without
 * normalization the archive fills up with duplicates that each need reviewing
 * separately, so everything funnels through `normalizeUrl` before it gets an id.
 *
 * Server side only (it hashes with node:crypto): the import scripts, the dev
 * API route and the tests use this, never the browser bundle.
 */
import { createHash } from "node:crypto";

import type { NeedleType } from "./types";

/** Params that identify content. Everything else is tracking or playback state. */
const KEEP_PARAMS = new Set(["v", "list", "id", "p", "q", "page", "story", "item"]);

const DROP_PARAM_PREFIXES = ["utm_", "mc_", "pk_", "hsa_", "ref_"];
const DROP_PARAMS = new Set([
  "si",
  "feature",
  "fbclid",
  "gclid",
  "igshid",
  "ref",
  "referrer",
  "source",
  "share",
  "t",
  "start",
  "index",
  "ab_channel",
  "app",
  "spm",
  "s",
  // Newsletter and share-widget noise: the path already identifies the post,
  // and these carry per-recipient ids that have no business in a public file.
  "isfreemail",
  "post_id",
  "publication_id",
  "triedredirect",
  "showwelcomeonshare",
  "email",
  "token",
]);

export function normalizeUrl(input: string): string | undefined {
  let raw = input.trim();
  if (!raw) return undefined;
  // Bookmark files contain javascript: bookmarklets, place: queries and files.
  if (!/^https?:\/\//i.test(raw)) return undefined;
  raw = raw.replace(/\s/g, "%20");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }

  let host = url.hostname.toLowerCase().replace(/^www\./, "");
  let path = url.pathname;
  const params = new URLSearchParams();

  // youtu.be/ID and music.youtube.com both mean youtube.com/watch?v=ID.
  if (host === "youtu.be") {
    const id = path.slice(1);
    host = "youtube.com";
    path = "/watch";
    if (id) params.set("v", id);
  } else if (host.endsWith("youtube.com")) {
    host = "youtube.com";
  }

  for (const [key, value] of url.searchParams) {
    const lower = key.toLowerCase();
    if (DROP_PARAMS.has(lower)) continue;
    if (DROP_PARAM_PREFIXES.some((prefix) => lower.startsWith(prefix))) continue;
    if (host === "youtube.com" && !KEEP_PARAMS.has(lower)) continue;
    if (params.has(key)) continue;
    params.set(key, value);
  }

  // A playlist link and a video-inside-that-playlist link are different things,
  // but "watch?v=X&list=Y" and "watch?v=X" are the same video.
  if (host === "youtube.com" && path === "/watch" && params.has("v")) params.delete("list");

  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
  const sorted = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const query = sorted.length > 0 ? `?${new URLSearchParams(sorted).toString()}` : "";
  return `https://${host}${path}${query}`;
}

/** Stable, short and collision-free enough for a few tens of thousands of links. */
export function needleId(normalized: string): string {
  return createHash("sha1").update(normalized).digest("hex").slice(0, 10);
}

const LECTURE_HOSTS = ["ocw.mit.edu", "coursera.org", "edx.org", "oyc.yale.edu", "nptel.ac.in"];
const PODCAST_HOSTS = ["lexfridman.com", "hubermanlab.com", "podcasts.apple.com", "nav.al"];
const PAPER_HOSTS = ["arxiv.org", "biorxiv.org", "doi.org", "pubmed.ncbi.nlm.nih.gov", "jstor.org"];
const BOOK_HOSTS = ["goodreads.com", "mitpress.mit.edu", "gutenberg.org"];
const INTERACTIVE_HOSTS = [
  "ncase.me",
  "explorabl.es",
  "distill.pub",
  "observablehq.com",
  "codesandbox.io",
  "codepen.io",
  "shadertoy.com",
  "desmos.com",
];

/**
 * A first guess so the review queue is not empty-handed, and so the AI pass has
 * something to correct rather than invent. Cheap and deliberately conservative:
 * anything ambiguous lands on "article", which is the most common case.
 */
export function inferType(normalized: string, title = ""): NeedleType {
  const url = new URL(normalized);
  const host = url.hostname;
  const path = url.pathname;

  if (host === "youtube.com") {
    if (path === "/playlist" || url.searchParams.has("list")) return "playlist";
    if (path === "/watch" || path.startsWith("/shorts/")) return "video";
    // /c/name, /user/name, /@name, /channel/ID are all channel pages.
    return "channel";
  }
  if (host === "vimeo.com" || host === "twitch.tv") return "video";
  if (host === "github.com" || host === "gitlab.com")
    return path.split("/").length > 2 ? "repo" : "other";
  if (host === "open.spotify.com") return path.startsWith("/episode") ? "podcast" : "other";
  if (PODCAST_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "podcast";
  if (PAPER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "paper";
  if (BOOK_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "book";
  if (LECTURE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "lecture";
  if (INTERACTIVE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "interactive";
  if (path.endsWith(".pdf")) return "paper";
  if (/\b(lecture|course|curriculum)\b/i.test(title)) return "lecture";

  // A bare domain is usually a person's site or a product, not one article.
  if (path === "/" || path === "") {
    if (/\b(blog|writing|essays|notes)\b/i.test(title)) return "blog";
    return "other";
  }
  return "article";
}

/**
 * Links that must never reach a public page, whatever their folder says:
 * shadow libraries and streaming sites, plus Rico's own accounts and paperwork.
 * These are skipped at import rather than imported and hidden, so they cannot
 * be published by a later bulk action.
 */
const BLOCKED_HOSTS = [
  "z-lib.org",
  "zlibrary-global.se",
  "libgen.is",
  "libgen.rs",
  "sci-hub.se",
  "annas-archive.org",
  "hianime.to",
  "ridomovies.tv",
  "345movies.com",
  "pdfdrive.com",
  "dkb.de",
  "banking.dkb.de",
  "paypal.com",
  "stripe.com",
  "mercury.com",
  "wise.com",
  "mail.google.com",
  "drive.google.com",
  "docs.google.com",
  "meta.com",
  "business.facebook.com",
  "web.whatsapp.com",
];

const BLOCKED_PATTERNS = [
  /\/piracy\b/i,
  /megathread/i,
  /\bsteuerrechner\b/i,
  /invoice-generator/i,
  /localhost/i,
  /127\.0\.0\.1/,
];

export function isBlocked(normalized: string, title = ""): boolean {
  const host = new URL(normalized).hostname;
  if (BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`)))
    return true;
  const haystack = `${normalized} ${title}`;
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(haystack));
}

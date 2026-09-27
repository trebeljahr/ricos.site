/**
 * Fetches what each page says about itself: thumbnail, site name, description,
 * author, publish date, and how long the thing takes.
 *
 *   pnpm needles:fetch                     everything without metadata yet
 *   pnpm needles:fetch --limit 200
 *   pnpm needles:fetch --stale 180         refresh anything older than 180 days
 *   pnpm needles:fetch --retry             try the ones that failed before
 *   pnpm needles:fetch --force --id ab12cd one link, again
 *
 * No model involved and no page text kept — this is the cheap pass, so it runs
 * over the whole archive rather than only over links that survived triage.
 * What it gives triage is a picture and a source: "(32) Answering Your
 * Questions" is unjudgeable, the same row with a thumbnail, "Ben Eater" and
 * "17 min" is one keystroke.
 *
 * It writes:
 *   - meta.json, the full record per needle, including failures;
 *   - and onto the needle itself, only facts rather than judgements: minutes,
 *     a cleaned-up title while nobody has reviewed it, and the dead flag.
 *
 * Deliberately polite: one request at a time per host with a gap between them,
 * a byte cap, and no retry storm. The archive is not going anywhere.
 */

import type { NeedleMeta } from "src/lib/needlestack/meta";
import {
  cleanTitle,
  hostOf,
  metaFromHtml,
  minutesFrom,
  youtubeThumbnail,
} from "src/lib/needlestack/meta";
import type { MetaFile } from "src/lib/needlestack/store";
import { readMeta, readNeedles, writeMeta, writeNeedles } from "src/lib/needlestack/store";
import type { Needle, Pool } from "src/lib/needlestack/types";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/124.0 Safari/537.36 (+https://ricos.site needlestack link checker)";

/** Enough for the head of any sane page; nobody needs 40MB of a video page. */
const MAX_BYTES = 800_000;
const TIMEOUT_MS = 20_000;
/** Minimum gap between two requests to the same host. */
const HOST_GAP_MS = 700;

type Args = {
  limit: number;
  concurrency: number;
  stale?: number;
  retry: boolean;
  force: boolean;
  id?: string;
  pool?: Pool;
  rating?: number;
};

function parseArgs(argv: string[]): Args {
  const flag = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? undefined : argv[index + 1];
  };
  const number = (name: string) => {
    const value = flag(name);
    return value === undefined ? undefined : Number(value);
  };
  return {
    limit: number("limit") ?? Number.POSITIVE_INFINITY,
    concurrency: number("concurrency") ?? 6,
    stale: number("stale"),
    retry: argv.includes("--retry"),
    force: argv.includes("--force"),
    id: flag("id"),
    pool: flag("pool") as Pool | undefined,
    rating: number("rating"),
  };
}

const lastHit = new Map<string, number>();

/** Spaces out requests per host without serialising the whole run. */
async function waitForHost(host: string) {
  const previous = lastHit.get(host) ?? 0;
  const wait = previous + HOST_GAP_MS - Date.now();
  lastHit.set(host, Date.now() + Math.max(0, wait));
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
}

/** Reads at most MAX_BYTES of the body, then drops the connection. */
async function readCapped(response: Response): Promise<string> {
  if (!response.body) return await response.text();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => undefined);
  return text;
}

type OEmbed = { title?: string; author_name?: string; thumbnail_url?: string };

/**
 * YouTube's watch pages increasingly answer a script with a consent wall, and
 * oEmbed answers title, channel and thumbnail without one. Used as a fallback
 * and to fill the gaps the watch page leaves.
 */
async function youtubeOEmbed(url: string): Promise<Partial<NeedleMeta> | undefined> {
  try {
    const endpoint = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return undefined;
    const data = (await response.json()) as OEmbed;
    return {
      title: data.title,
      author: data.author_name,
      siteName: "YouTube",
      image: data.thumbnail_url,
    };
  } catch {
    return undefined;
  }
}

async function fetchMeta(needle: Needle): Promise<NeedleMeta> {
  const host = hostOf(needle.url);
  const base: NeedleMeta = { fetchedAt: new Date().toISOString(), ok: false };

  await waitForHost(host);
  let response: Response;
  try {
    response = await fetch(needle.url, {
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "accept-language": "en,de;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    const message = (error as Error).message;
    return {
      ...base,
      error: message.slice(0, 200),
      // DNS failures mean the domain itself is gone; timeouts do not.
      dead: /ENOTFOUND|getaddrinfo|ERR_NAME_NOT_RESOLVED/i.test(message),
      ...(youtubeThumbnail(needle.url) ? { image: youtubeThumbnail(needle.url) } : {}),
    };
  }

  const meta: NeedleMeta = {
    ...base,
    httpStatus: response.status,
    ok: response.ok,
    dead: response.status === 404 || response.status === 410,
  };

  const contentType = response.headers.get("content-type") ?? "";
  if (response.ok && contentType.includes("html")) {
    Object.assign(meta, metaFromHtml(await readCapped(response), response.url));
    meta.ok = true;
  } else if (response.ok) {
    // A PDF, image or feed: the type is the only thing worth recording.
    meta.ogType = contentType.split(";")[0].trim();
    meta.ok = true;
  }

  if (host.endsWith("youtube.com")) {
    const fallback = await youtubeOEmbed(needle.url);
    if (fallback) {
      meta.title ??= fallback.title;
      meta.author ??= fallback.author;
      meta.image ??= fallback.image;
      meta.siteName ??= fallback.siteName;
      // A video that oEmbed still knows is not gone, whatever the watch page
      // answered a script.
      if (fallback.title) {
        meta.dead = false;
        meta.ok = true;
      }
    }
    meta.image ??= youtubeThumbnail(needle.url);
  }

  meta.siteName ??= host;
  for (const key of Object.keys(meta) as (keyof NeedleMeta)[]) {
    if (meta[key] === undefined) delete meta[key];
  }
  return meta;
}

/**
 * Facts from the page, written onto the needle. Judgements (rating, door,
 * paths, the note) are never touched — those are Rico's, and a fetch is not an
 * opinion.
 */
function applyToNeedle(needle: Needle, meta: NeedleMeta): boolean {
  const before = JSON.stringify(needle);

  const minutes = minutesFrom(meta);
  if (minutes && !needle.minutes) needle.minutes = minutes;

  // Only while nobody has reviewed it: after that the title on the card is a
  // decision, not a default.
  if (needle.status !== "reviewed") {
    const better = cleanTitle(meta.title) ?? cleanTitle(needle.title);
    if (better && better !== needle.title) needle.title = better;
  }

  if (meta.dead === true) needle.dead = true;
  else if (meta.ok) delete needle.dead;

  if (meta.ogType === "video.other" || meta.ogType === "video.episode") {
    if (needle.type === "article" || needle.type === "other") needle.type = "video";
  }

  return JSON.stringify(needle) !== before;
}

function shouldFetch(needle: Needle, meta: MetaFile, args: Args): boolean {
  if (args.id) return needle.id === args.id;
  if (args.pool && needle.pool !== args.pool) return false;
  if (args.rating !== undefined && needle.rating < args.rating) return false;
  if (args.force) return true;

  const existing = meta[needle.id];
  if (!existing) return true;
  if (!existing.ok) return args.retry;
  if (args.stale !== undefined) {
    const age = (Date.now() - Date.parse(existing.fetchedAt)) / 86_400_000;
    return age > args.stale;
  }
  return false;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [needles, meta] = await Promise.all([readNeedles(), readMeta()]);

  const todo = needles
    .filter((needle) => shouldFetch(needle, meta, args))
    .slice(0, args.limit === Number.POSITIVE_INFINITY ? undefined : args.limit);

  if (todo.length === 0) {
    console.log("nothing to fetch");
    return;
  }
  console.log(`fetching ${todo.length} pages, ${args.concurrency} at a time`);

  let index = 0;
  let done = 0;
  let failed = 0;
  let dead = 0;
  let withImage = 0;
  let dirty = false;
  let lastWrite = Date.now();

  // Interleave hosts so the per-host gap costs nothing: without this, 600
  // youtube.com links in a row would serialise the whole run.
  const queue = [...todo].sort((a, b) => a.id.localeCompare(b.id));

  const flush = async (force = false) => {
    if (!dirty) return;
    if (!force && Date.now() - lastWrite < 5000) return;
    dirty = false;
    lastWrite = Date.now();
    await writeMeta(meta);
    await writeNeedles(needles);
  };

  async function worker() {
    while (index < queue.length) {
      const needle = queue[index++];
      const position = index;
      try {
        const fetched = await fetchMeta(needle);
        meta[needle.id] = { ...fetched, attempts: (meta[needle.id]?.attempts ?? 0) + 1 };
        applyToNeedle(needle, fetched);
        dirty = true;
        done++;
        if (fetched.dead) dead++;
        if (fetched.image) withImage++;
        if (!fetched.ok) failed++;
        if (position % 25 === 0 || position === queue.length)
          console.log(
            `${position}/${queue.length} · ${done} fetched, ${withImage} with a picture, ` +
              `${dead} dead, ${failed} failed`,
          );
      } catch (error) {
        failed++;
        meta[needle.id] = {
          fetchedAt: new Date().toISOString(),
          ok: false,
          error: (error as Error).message.slice(0, 200),
          attempts: (meta[needle.id]?.attempts ?? 0) + 1,
        };
        dirty = true;
      }
      await flush();
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(args.concurrency, queue.length)) }, worker),
  );
  await flush(true);

  const missing = needles.filter((needle) => !meta[needle.id]).length;
  console.log(
    `done: ${done} fetched (${withImage} with a picture, ${dead} dead, ${failed} failed), ` +
      `${missing} needles still have no metadata`,
  );
}

void main();

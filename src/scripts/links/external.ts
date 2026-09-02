/**
 * Opt-in outbound link check. Deliberately *not* part of `postbuild`: a
 * build-blocking network check is flaky, and a flaky check gets disabled.
 * Offline checks fail the build; this one writes a report and exits 0 unless
 * `--strict` is passed by hand.
 *
 * "Dead" is deliberately narrower than "4xx". 404/410 (and the malformed-URL
 * 400/414) mean the page is gone. The rest of the 4xx range is overwhelmingly
 * the host objecting to *us* — npmjs, nytimes, tesla and shadertoy all 403 a
 * scripted request while serving the same URL fine in a browser, and 401 is a
 * paywall. Calling those dead buries the real rot under ~40 false positives, so
 * they land in the inconclusive bucket alongside 429, 5xx, timeouts and DNS
 * failures. The report lists them by status so nothing is silently dropped.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pLimit from "p-limit";
import { type Reference, ROOT } from "./references";

export const CACHE_DIR = resolve(ROOT, ".link-check");
const CACHE_FILE = resolve(CACHE_DIR, "cache.json");
const REPORT_FILE = resolve(CACHE_DIR, "external-report.md");

const TTL_DAYS = 30;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;
const HOST_CONCURRENCY = 16;
const HOST_DELAY_MS = 500;
const TIMEOUT_MS = 15_000;
const USER_AGENT = "Mozilla/5.0 (compatible; ricos.site-linkcheck/1.0; +https://ricos.site)";

export type Verdict = "ok" | "dead" | "inconclusive";
/** The verdict is derived, not stored, so tightening `classify` reuses the cache. */
type CacheEntry = { status: number | null; note: string; checkedAt: number };
type Cache = Record<string, CacheEntry>;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

function readCache(): Cache {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf-8")) as Cache;
  } catch {
    return {};
  }
}

function writeCache(cache: Cache) {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, `${JSON.stringify(cache, null, 2)}\n`);
}

const GONE = new Set([400, 404, 410, 414]);

function classify(status: number): Verdict {
  if (status >= 200 && status < 400) return "ok";
  return GONE.has(status) ? "dead" : "inconclusive";
}

function verdictOf(entry: CacheEntry): Verdict {
  return entry.status === null ? "inconclusive" : classify(entry.status);
}

async function request(url: string, method: "HEAD" | "GET"): Promise<Response> {
  return fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "user-agent": USER_AGENT,
      accept: "*/*",
      // Some CDNs 403 a bare HEAD from an unknown agent but serve a ranged GET.
      ...(method === "GET" ? { range: "bytes=0-0" } : {}),
    },
  });
}

async function probe(url: string): Promise<Omit<CacheEntry, "checkedAt">> {
  let headStatus: number | null = null;
  try {
    const head = await request(url, "HEAD");
    if (classify(head.status) === "ok") return { status: head.status, note: "HEAD" };
    headStatus = head.status;
  } catch {
    // Fall through to GET — plenty of hosts simply do not implement HEAD.
  }

  try {
    const get = await request(url, "GET");
    return { status: get.status, note: "GET" };
  } catch (error) {
    const message = error instanceof Error ? error.name : "fetch failed";
    return { status: headStatus, note: message === "TimeoutError" ? "timeout" : message };
  }
}

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

export type ExternalResult = {
  checked: number;
  fromCache: number;
  dead: Outcome[];
  inconclusive: Outcome[];
  reportPath: string;
};

type Outcome = { url: string; entry: CacheEntry; references: Reference[] };

export async function checkExternalLinks(
  references: Reference[],
  { refresh = false }: { refresh?: boolean } = {},
): Promise<ExternalResult> {
  const byUrl = new Map<string, Reference[]>();
  for (const reference of references) {
    const url = reference.href.split("#")[0];
    if (!hostOf(url)) continue;
    const bucket = byUrl.get(url);
    if (bucket) bucket.push(reference);
    else byUrl.set(url, [reference]);
  }

  const cache = readCache();
  const now = Date.now();
  const stale = (url: string) => refresh || !cache[url] || now - cache[url].checkedAt > TTL_MS;

  const byHost = new Map<string, string[]>();
  let fromCache = 0;
  for (const url of byUrl.keys()) {
    if (!stale(url)) {
      fromCache++;
      continue;
    }
    const host = hostOf(url) as string;
    const bucket = byHost.get(host);
    if (bucket) bucket.push(url);
    else byHost.set(host, [url]);
  }

  const pending = [...byHost.values()].reduce((total, urls) => total + urls.length, 0);
  if (pending > 0) {
    console.log(
      `[checkLinks:external] ${pending} url(s) to probe across ${byHost.size} host(s) ` +
        `(${fromCache} still fresh in the ${TTL_DAYS}-day cache).`,
    );
  }

  const limit = pLimit(HOST_CONCURRENCY);
  let done = 0;
  await Promise.all(
    [...byHost.values()].map((urls) =>
      limit(async () => {
        // One host at a time, with a pause between hits — being rude here is
        // how a link checker earns a 429 and reports false deaths.
        for (const url of urls) {
          cache[url] = { ...(await probe(url)), checkedAt: Date.now() };
          done++;
          if (done % 25 === 0) console.log(`[checkLinks:external] ${done}/${pending}`);
          await sleep(HOST_DELAY_MS);
        }
      }),
    ),
  );
  writeCache(cache);

  const dead: Outcome[] = [];
  const inconclusive: Outcome[] = [];
  for (const [url, references] of byUrl) {
    const entry = cache[url];
    if (!entry) continue;
    const verdict = verdictOf(entry);
    if (verdict === "dead") dead.push({ url, entry, references });
    else if (verdict === "inconclusive") inconclusive.push({ url, entry, references });
  }
  const byUrlName = (a: Outcome, b: Outcome) => a.url.localeCompare(b.url);
  dead.sort(byUrlName);
  inconclusive.sort(byUrlName);

  writeReport(byUrl.size, dead, inconclusive);
  return { checked: byUrl.size, fromCache, dead, inconclusive, reportPath: REPORT_FILE };
}

function writeReport(total: number, dead: Outcome[], inconclusive: Outcome[]) {
  const lines = [
    "# External link report",
    "",
    `Generated ${new Date().toISOString()}`,
    "",
    `- ${total} unique outbound URLs`,
    `- ${dead.length} dead (404 / 410 / malformed)`,
    `- ${inconclusive.length} inconclusive (403, 401, 429, 5xx, timeout — not failures)`,
    "",
  ];

  if (dead.length === 0) {
    lines.push("No dead outbound links.", "");
  } else {
    lines.push("## Dead links", "");
    for (const { url, entry, references } of dead) {
      lines.push(`### ${url}`, "", `\`${entry.status ?? "?"}\` via ${entry.note}`, "");
      for (const { file, line } of references) lines.push(`- ${file}:${line}`);
      lines.push("");
    }
  }

  if (inconclusive.length > 0) {
    lines.push(
      "## Inconclusive",
      "",
      "Worth a spot check by hand, but not link rot: mostly bot-blocking and rate limits.",
      "",
    );
    for (const { url, entry, references } of inconclusive) {
      const [first] = references;
      lines.push(`- \`${entry.status ?? entry.note}\` ${url} — ${first.file}:${first.line}`);
    }
    lines.push("");
  }

  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(REPORT_FILE, lines.join("\n"));
}

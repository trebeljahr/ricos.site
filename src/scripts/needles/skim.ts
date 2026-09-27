/**
 * Second pass: fetch the page and draft the "why it's here" line, but only for
 * links that already earned it.
 *
 *   pnpm needles:skim                    rating >= 2 and no note yet, 40 links
 *   pnpm needles:skim --rating 3 --limit 10
 *   pnpm needles:skim --force            redo notes a previous pass drafted
 *
 * Fetching thousands of pages to annotate links nobody vouched for would be
 * waste, so this runs after triage, not before. A drafted note is stored as
 * `noteSource: "ai"` and shown as a draft in /dev/needlestack until Rico edits
 * or accepts it — the note is the actual curation, so a machine never gets the
 * last word on it.
 *
 * Also picks up the two facts pages hand over for free: how long the thing is
 * (YouTube length, or words divided by reading speed) and how introductory it is.
 */
import { readNeedles, writeNeedles } from "src/lib/needlestack/store";
import type { Level, Needle } from "src/lib/needlestack/types";

import { askForJson } from "./claudeCli";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const WORDS_PER_MINUTE = 220;

type PageFacts = {
  title?: string;
  description?: string;
  text: string;
  minutes?: number;
};

function textBetween(html: string, pattern: RegExp): string | undefined {
  return html.match(pattern)?.[1]?.trim();
}

function stripToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFacts(url: string): Promise<PageFacts> {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const html = (await response.text()).slice(0, 1_500_000);

  const facts: PageFacts = {
    title: textBetween(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description:
      textBetween(html, /<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i) ??
      textBetween(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i),
    text: "",
  };

  // YouTube ships the duration in the watch page's player payload; everything
  // else gets a word-count estimate, which is close enough for a filter.
  const seconds = html.match(/"lengthSeconds":"(\d+)"/)?.[1];
  if (seconds) facts.minutes = Math.max(1, Math.round(Number(seconds) / 60));

  const text = stripToText(html);
  facts.text = text.slice(0, 4000);
  if (!facts.minutes) {
    const words = text.split(/\s+/).length;
    if (words > 300) facts.minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  }
  return facts;
}

function notePrompt(needle: Needle, facts: PageFacts): string {
  return `Write the one-line reason a curated link collection keeps this page. The collection belongs to Rico, a software engineer into graphics programming, neuroscience, maths, biology, long journeys, meditation and making things by hand.

Link title: ${needle.title}
URL: ${needle.url}
Page title: ${facts.title ?? "unknown"}
Page description: ${facts.description ?? "none"}
Page text (truncated): ${facts.text}

Rules for the note:
- 1 or 2 sentences, max 220 characters total.
- Say what the reader gets out of it, concretely. Name the actual subject.
- Plain words. No hype ("stunning", "powerful", "must-read", "deep dive", "game-changing"), no "this article explores", no praise without substance.
- Write it as a claim about the thing, not about Rico's feelings.
- If the page is dead, a login wall, a paywall or unrelated to its title, say so in the note and set "dead": true.

Answer with one JSON object only:
[{"note":"...","minutes":12,"level":"intro","topics":["fourier","signal-processing"],"dead":false}]`;
}

type SkimRow = {
  note?: string;
  minutes?: number;
  level?: string;
  topics?: string[];
  dead?: boolean;
};

function parseArgs(argv: string[]) {
  const flag = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index === -1 ? undefined : argv[index + 1];
  };
  return {
    rating: Number(flag("rating") ?? 2),
    limit: Number(flag("limit") ?? 40),
    model: flag("model") ?? "haiku",
    concurrency: Number(flag("concurrency") ?? 4),
    force: argv.includes("--force"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const needles = await readNeedles();

  const todo = needles
    // A dead link has nothing to say about itself; the fetch pass already knows.
    .filter(
      (needle) => needle.status !== "rejected" && !needle.dead && needle.rating >= args.rating,
    )
    .filter((needle) => (args.force ? needle.noteSource !== "manual" : !needle.note))
    .slice(0, args.limit);

  if (todo.length === 0) {
    console.log(`nothing to skim (rating >= ${args.rating}, missing a note)`);
    return;
  }
  console.log(`skimming ${todo.length} pages with ${args.model}`);

  let index = 0;
  let noted = 0;
  let dead = 0;
  let failed = 0;

  async function worker() {
    while (index < todo.length) {
      const needle = todo[index++];
      try {
        const facts = await fetchFacts(needle.url);
        const rows = await askForJson<SkimRow>(notePrompt(needle, facts), args.model);
        const row = rows[0];
        if (!row?.note) throw new Error("no note in answer");

        needle.note = row.note.trim().slice(0, 400);
        needle.noteSource = "ai";
        if (!needle.minutes) needle.minutes = row.minutes ?? facts.minutes;
        if (!needle.level && (row.level === "intro" || row.level === "deep"))
          needle.level = row.level as Level;
        if (Array.isArray(row.topics)) {
          const extra = row.topics
            .filter((topic): topic is string => typeof topic === "string")
            .map((topic) => topic.toLowerCase().trim().replace(/\s+/g, "-"));
          needle.topics = [...new Set([...needle.topics, ...extra])].slice(0, 6);
        }
        // A dead link is a triage decision, not a publish decision: drop the
        // rating to 0 so it cannot render, and let Rico reject or fix it.
        if (row.dead) {
          needle.rating = 0;
          dead++;
        }
        noted++;
        await writeNeedles(needles);
        console.log(`${noted}/${todo.length} ${needle.title.slice(0, 60)}`);
      } catch (error) {
        failed++;
        console.error(`skip ${needle.url}: ${(error as Error).message.slice(0, 160)}`);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(args.concurrency, todo.length)) }, worker),
  );
  console.log(`drafted ${noted} notes (${dead} look dead), ${failed} failed`);
}

void main();

// Finds a free portrait for every quote author: author name -> Wikidata person
// -> their image (P18) on Wikimedia Commons, with license and credit.
//
//   pnpm quotes:portraits          write portraits-review.md (with previews) to the AI folder
//   pnpm quotes:portraits:apply    review file -> src/content/Notes/pages/quote-portraits.json
//
// Run from the main checkout. In the review file set `status: ok` on the
// portraits to use, or change `file:` to another Commons file first. Apply
// fetches license and credit again for whatever file is listed.

import fs from "node:fs";
import path from "node:path";
import { cleanAuthor, type Portrait } from "../../lib/quotePortraits";
import { parseReview, QUOTES_JSON, type Quote, REVIEW_DIR } from "./quoteReviewFormat";

const REVIEW_PATH = path.join(REVIEW_DIR, "portraits-review.md");
const SHORTLIST_PATH = path.join(REVIEW_DIR, "booknote-quote-shortlist.md");
export const PORTRAITS_JSON = "src/content/Notes/pages/quote-portraits.json";
const THUMB_WIDTH = 160;
const HEADERS = { "User-Agent": "ricos.site quote portraits (https://ricos.site)" };

async function api(host: string, params: Record<string, string>) {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: "json", ...params })}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (res.ok) return await res.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  throw new Error(`Request failed: ${url}`);
}

type Match = {
  id: string;
  label: string;
  description: string;
  image?: string;
  /** Number of Wikipedia editions with an article: a rough fame score to pick between namesakes. */
  sitelinks: number;
  exact: boolean;
  similar: boolean;
};

export type Resolution = { match?: Match; status: "ok" | "check" | "none"; note?: string };

const TITLES = new Set(["sir", "dr", "st", "saint", "jr"]);

const tokens = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t && !TITLES.has(t));

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row[j];
      row[j] = next;
    }
  }
  return row[b.length];
}

// Same person despite a typo, a missing title or swapped names: every word of
// the quoted name has a near-identical word in the label, and every initial
// ("A. S. Neill") starts one.
function similarName(name: string, label: string) {
  const labelTokens = tokens(label);
  const nameTokens = tokens(name);
  return (
    nameTokens.some((t) => t.length > 1) &&
    nameTokens.every((t) =>
      t.length === 1
        ? labelTokens.some((l) => l.startsWith(t))
        : labelTokens.some((l) => distance(t, l) <= (t.length > 5 ? 2 : t.length > 3 ? 1 : 0)),
    )
  );
}

// Quote authors are mostly writers and thinkers. A match described only by
// one of these jobs is more likely a namesake.
const UNLIKELY =
  /\b(actor|actress|player|footballer|singer|guitarist|rapper|musician|composer|politician|painter|hockey|baseball|soccer|motocross|athlete|swimmer|cyclist|wrestler|canoeist)\b/i;
const LIKELY =
  /\b(writer|author|philosoph\w*|scientist|physicist|poet|novelist|essayist|economist|entrepreneur|investor|psycholog\w*|programmer|theolog\w*|mathematician|historian)\b/i;

async function people(ids: string[], name: string): Promise<Match[]> {
  if (ids.length === 0) return [];
  const data = await api("www.wikidata.org", {
    action: "wbgetentities",
    ids: ids.join("|"),
    props: "claims|labels|aliases|descriptions|sitelinks",
    languages: "en|mul",
  });
  const lower = name.toLowerCase();
  return ids
    .map((id) => data.entities[id])
    .filter((e) => e?.claims?.P31?.some((c: any) => c.mainsnak.datavalue?.value.id === "Q5"))
    .map((e) => {
      // Wikidata keeps many names under "mul" (all languages) instead of "en".
      const label: string = e.labels?.en?.value ?? e.labels?.mul?.value ?? "";
      const aliases: string[] = [...(e.aliases?.en ?? []), ...(e.aliases?.mul ?? [])].map(
        (a: any) => a.value,
      );
      const names = [label, ...aliases];
      return {
        id: e.id,
        label,
        description: e.descriptions?.en?.value ?? e.descriptions?.mul?.value ?? "",
        image: e.claims.P18?.[0]?.mainsnak.datavalue?.value,
        sitelinks: Object.keys(e.sitelinks ?? {}).length,
        exact: names.some((n) => n.toLowerCase() === lower),
        similar: names.some((n) => similarName(name, n)),
      };
    });
}

const byFame = (a: Match, b: Match) => b.sitelinks - a.sitelinks;

async function findPerson(name: string): Promise<Resolution> {
  const search = await api("www.wikidata.org", {
    action: "wbsearchentities",
    search: name,
    language: "en",
    type: "item",
    limit: "7",
  });
  const found = await people(
    search.search.map((s: any) => s.id),
    name,
  );

  const exact = found.filter((m) => m.exact).sort(byFame);
  if (exact.length > 0) {
    const match = exact[0];
    if (!match.image) return { match, status: "none", note: "no portrait on Wikidata" };
    // A namesake only matters when they are nearly as well known.
    const rival = exact[1] && exact[1].sitelinks * 3 >= match.sitelinks;
    const notes = [
      rival && `${exact[1].label} (${exact[1].description}) has the same name`,
      UNLIKELY.test(match.description) &&
        !LIKELY.test(match.description) &&
        "description does not sound like a writer",
    ].filter(Boolean);
    return { match, status: notes.length ? "check" : "ok", note: notes.join("; ") || undefined };
  }

  // Misspelled names: Wikipedia's full-text search forgives typos, Wikidata's does not.
  const wiki = await api("en.wikipedia.org", {
    action: "query",
    generator: "search",
    gsrsearch: name,
    gsrlimit: "3",
    prop: "pageprops",
    ppprop: "wikibase_item",
  });
  const pages = Object.values(wiki.query?.pages ?? {}) as any[];
  const ids = pages.map((p) => p.pageprops?.wikibase_item).filter(Boolean);
  const similar = [...found, ...(await people(ids, name))]
    .filter((m) => m.similar && m.image)
    .sort(byFame);
  if (similar.length > 0) {
    return { match: similar[0], status: "check", note: "name spelled differently on Wikidata" };
  }
  return { status: "none" };
}

const stripHtml = (html = "") =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function commonsInfo(files: string[]) {
  const info = new Map<string, Portrait>();
  for (let i = 0; i < files.length; i += 50) {
    const data = await api("commons.wikimedia.org", {
      action: "query",
      titles: files
        .slice(i, i + 50)
        .map((f) => `File:${f}`)
        .join("|"),
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: String(THUMB_WIDTH),
    });
    const normalized = new Map<string, string>(
      (data.query.normalized ?? []).map((n: any) => [n.to, n.from]),
    );
    for (const page of Object.values(data.query.pages) as any[]) {
      const ii = page.imageinfo?.[0];
      if (!ii) continue;
      const requested = (normalized.get(page.title) ?? page.title).replace(/^File:/, "");
      const meta = ii.extmetadata ?? {};
      info.set(requested, {
        file: page.title.replace(/^File:/, ""),
        thumb: ii.thumburl,
        page: ii.descriptionurl,
        artist: stripHtml(meta.Artist?.value) || "unknown",
        license: stripHtml(meta.LicenseShortName?.value) || "unknown license",
      });
    }
  }
  return info;
}

function authors() {
  const quotes: Quote[] = JSON.parse(fs.readFileSync(QUOTES_JSON, "utf8"));
  const shortlist = fs.existsSync(SHORTLIST_PATH)
    ? parseReview(fs.readFileSync(SHORTLIST_PATH, "utf8"))
    : [];
  return [...new Set([...quotes, ...shortlist].map((q) => cleanAuthor(q.author)))].sort();
}

async function resolve() {
  const names = authors();
  const rows: ({ name: string } & Resolution)[] = [];
  for (const name of names) {
    rows.push({ name, ...(await findPerson(name)) });
    process.stdout.write(".");
  }
  const files = rows.map((r) => r.match?.image).filter((f): f is string => Boolean(f));
  const info = await commonsInfo(files);

  const sections = rows.map(({ name, match, status: found, note }) => {
    const portrait = match?.image ? info.get(match.image) : undefined;
    const lines = [`### ${name}`];
    if (portrait) lines.push(`![${name}|80](${portrait.thumb})`);
    lines.push("");
    if (match) lines.push(`wikidata: ${match.id} · ${match.label} · ${match.description}`);
    lines.push(`file: ${portrait?.file ?? ""}`);
    if (portrait) lines.push(`credit: ${portrait.artist} · ${portrait.license}`);
    const status = portrait ? found : "none";
    if (note) lines.push(`note: ${note}`);
    lines.push(`status: ${status}`);
    return { status, text: lines.join("\n") };
  });

  const count = (s: string) => sections.filter((x) => x.status === s).length;
  const markdown = `# Quote author portraits

Portraits from Wikimedia Commons, found through each author's Wikidata entry (2026-09-16).
Covers authors in quotes.json and booknote-quote-shortlist.md. **Not live** until \`pnpm quotes:portraits:apply\`.

- \`status: ok\` (${count("ok")}): one well-known person with exactly this name. Still worth a glance.
- \`status: check\` (${count("check")}): see the note: a typo in the author name, several people with this name, or a namesake who is an actor, athlete and so on.
- \`status: none\` (${count("none")}): no matching person with a Commons portrait (brands, proverbs, fictional characters, lesser-known writers).

Set a status to \`ok\` to use the portrait, anything else to skip it. To use a different picture, put another Commons file name in \`file:\`.
Cards show portraits in grayscale and credit the photographer on hover.

## Authors

${sections.map((s) => `${s.text}\n`).join("\n")}`;
  fs.writeFileSync(REVIEW_PATH, markdown);
  console.log(
    `\nWrote ${names.length} authors to ${REVIEW_PATH} (${count("ok")} ok, ${count("check")} check, ${count("none")} none)`,
  );
}

async function apply() {
  const sections = fs.readFileSync(REVIEW_PATH, "utf8").split(/^### /m).slice(1);
  const chosen = sections
    .map((section) => {
      const [heading, ...body] = section.split("\n");
      const field = (key: string) =>
        body
          .find((line) => line.startsWith(`${key}:`))
          ?.slice(key.length + 1)
          .trim() ?? "";
      return { name: heading.trim(), file: field("file"), status: field("status") };
    })
    .filter((s) => s.status === "ok" && s.file);

  const info = await commonsInfo(chosen.map((c) => c.file));
  const portraits: Record<string, Portrait> = {};
  for (const { name, file } of chosen) {
    const portrait = info.get(file);
    if (portrait) portraits[name] = portrait;
    else console.warn(`Not found on Commons, skipped: ${name} (${file})`);
  }
  fs.writeFileSync(PORTRAITS_JSON, `${JSON.stringify(portraits, undefined, 2)}\n`);
  console.log(`Wrote ${Object.keys(portraits).length} portraits to ${PORTRAITS_JSON}`);
}

const command = process.argv[2];
if (command === "resolve") await resolve();
else if (command === "apply") await apply();
else {
  console.error("Usage: tsx src/scripts/quotes/authorPortraits.ts <resolve|apply>");
  process.exit(1);
}

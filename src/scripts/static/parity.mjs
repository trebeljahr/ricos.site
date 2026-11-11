#!/usr/bin/env node
/**
 * Compare two hosts of ricos.site page by page: every sitemap path of the
 * reference (A) plus extras, by status, redirect target and <title>; then the
 * API answers that must not change (validation, CORS, confirm redirect,
 * kestrel, quote, random photo) and the content type of non-HTML files.
 *
 *   node src/scripts/static/parity.mjs [A=https://ricos.site] [B=http://127.0.0.1:58731]
 *
 * Exit code 1 when anything differs.
 */
const A = (process.argv[2] ?? "https://ricos.site").replace(/\/$/, "");
const B = (process.argv[3] ?? "http://127.0.0.1:58731").replace(/\/$/, "");
const UA = { "User-Agent": "ricos-site-parity-check" };

const extra = [
  "/",
  "/rss.xml",
  "/atom.xml",
  "/feed.json",
  "/sitemap.xml",
  "/robots.txt",
  "/projects/rss.xml",
  "/search-index.json",
  "/newsletter",
  "/newsletter/12",
  "/newsletters/12",
  "/12",
  "/pages/now",
  "/pages",
  "/feed.xml",
  "/plasma",
  "/support",
  "/does-not-exist",
  "/dev/diary",
  "/dev/diary/desk",
  "/computer/demos",
  "/piano/demos",
  "/piano",
  "/api/random-quote",
  "/api/nope",
  "/favicon.ico",
  "/manifest.json",
  "/needlestack-2",
  "/donate",
  "/donate/fractal-garden",
  "/donate/nope",
  "/dev/alt-review",
  "/dev/needlestack",
  "/emergency",
  "/email-signup-success",
  "/email-signup-error",
  "/r3f/experiments/navmesh-3rd-person",
  "/3d-assets/glb/Mixamo.glb",
];

async function get(base, path, init = {}) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(base + path, {
        redirect: "manual",
        ...init,
        headers: { ...UA, ...init.headers },
      });
      const type = r.headers.get("content-type") ?? "";
      const body = r.status === 200 && type.includes("html") ? await r.text() : "";
      if (!body) await r.body?.cancel();
      const raw = r.headers.get("location");
      const loc = raw === null ? "" : raw.replace(base, "") || "/";
      return {
        s: r.status,
        loc,
        title: body.match(/<title>([^<]*)/)?.[1] ?? "",
        type,
        headers: r.headers,
      };
    } catch (e) {
      if (i === 2)
        return { s: `ERR ${e.message}`, loc: "", title: "", type: "", headers: new Headers() };
    }
  }
}

const sitemap = await (await fetch(`${A}/sitemap.xml`, { headers: UA })).text();
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const sitemapPaths = locs.filter((l) => !l.endsWith(".xml")).map((l) => new URL(l).pathname);
const paths = [...new Set([...extra, ...sitemapPaths])];

const diffs = [];
const queue = [...paths];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const p = queue.shift();
      const [a, b] = await Promise.all([get(A, p), get(B, p)]);
      const typeA = a.type.split(";")[0];
      const typeB = b.type.split(";")[0];
      if (
        a.s !== b.s ||
        a.loc !== b.loc ||
        a.title !== b.title ||
        (a.s === 200 && typeA !== typeB)
      ) {
        diffs.push(
          `${p}\n   A ${a.s} ${a.loc} ${typeA} ${a.title.slice(0, 60)}\n   B ${b.s} ${b.loc} ${typeB} ${b.title.slice(0, 60)}`,
        );
      }
    }
  }),
);
console.log(
  `pages: ${paths.length} paths (${sitemapPaths.length} from the sitemap), ${diffs.length} differ`,
);
for (const d of diffs) console.log(d);

// API behaviour: compare A and B answer for answer.
const json = { "content-type": "application/json" };
const apiChecks = [
  [
    "signup: invalid address",
    "/api/signup",
    { method: "POST", headers: json, body: '{"email":"x"}' },
    true,
  ],
  ["signup: GET", "/api/signup", {}, true],
  [
    "announce: preflight fractal.garden",
    "/api/announce-signup",
    {
      method: "OPTIONS",
      headers: {
        Origin: "https://fractal.garden",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
      },
    },
    false,
  ],
  [
    "announce: invalid address from fractal.garden",
    "/api/announce-signup",
    {
      method: "POST",
      headers: { ...json, Origin: "https://fractal.garden" },
      body: '{"email":"x"}',
    },
    true,
  ],
  [
    "announce: foreign origin",
    "/api/announce-signup",
    {
      method: "POST",
      headers: { ...json, Origin: "https://evil.example" },
      body: '{"email":"x"}',
    },
    true,
  ],
  ["confirm: bad token", "/api/confirm-email?token=bad", {}, false],
  ["confirm: no token", "/api/confirm-email", {}, false],
  ["emergency: no password", "/api/emergency", {}, true],
  [
    "emergency: wrong password",
    "/api/emergency",
    { headers: { "x-emergency-password": "wrong" } },
    true,
  ],
  ["kestrel event: GET", "/kestrel/k", {}, true],
  ["kestrel script", "/kestrel/k.js", {}, false],
  ["quote", "/api/quote", {}, false],
  ["random photo", "/api/random-photo", {}, false],
];
let apiDiffs = 0;
for (const [label, path, init, compareBody] of apiChecks) {
  const answer = async (base) => {
    const r = await fetch(base + path, {
      redirect: "manual",
      ...init,
      headers: { ...UA, ...init.headers },
    });
    const text = await r.text();
    const h = (n) => r.headers.get(n) ?? "";
    return {
      status: r.status,
      location: h("location") ? h("location").replace(base, "") || "/" : "",
      type: h("content-type").split(";")[0],
      cors: [
        h("access-control-allow-origin"),
        h("access-control-allow-methods"),
        h("access-control-allow-headers"),
      ].join("|"),
      frame: h("x-frame-options"),
      body: compareBody ? text : "",
      shape:
        r.status >= 300 && r.status < 400
          ? ""
          : (() => {
              try {
                return Object.keys(JSON.parse(text)).sort().join(",");
              } catch {
                return text.length > 0 ? "text" : "";
              }
            })(),
    };
  };
  const [a, b] = await Promise.all([answer(A), answer(B)]);
  const same = JSON.stringify(a) === JSON.stringify(b);
  if (!same) apiDiffs++;
  console.log(
    `${same ? "✓" : "✗"} ${label}: ${b.status} ${b.location || b.type}${same ? "" : `\n   A ${JSON.stringify(a)}\n   B ${JSON.stringify(b)}`}`,
  );
}
console.log(`api: ${apiChecks.length} checks, ${apiDiffs} differ`);
process.exit(diffs.length + apiDiffs > 0 ? 1 : 0);

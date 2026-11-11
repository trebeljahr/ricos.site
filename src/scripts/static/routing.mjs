// Headers and redirects of the static site, in one place for both servers:
// `next dev` reads them through next.config.mjs, and finishExport.ts writes
// them to out/_headers and out/_redirects for the Cloudflare Worker that
// serves the export. The API Worker (workers/api) adds the same security
// headers to its own answers.
//
// The redirect table itself stays in src/scripts/createRedirects.js (the
// markdown build and the link checker read it too); this file only turns
// its Next-style rules into Cloudflare `_redirects` lines.

/** Browser-hardening headers on every path. */
export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** The test host: kept out of search results so it never competes with ricos.site. */
export const NOINDEX_HOSTS = ["next.ricos.site"];

/**
 * Next redirects → `_redirects` rules `[from, to, status]`.
 *
 * Cloudflare's syntax (https://developers.cloudflare.com/workers/static-assets/redirects/):
 * `:name` is one segment, a trailing `*` is the rest of the path and comes
 * back as `:splat`. Next's `:id*` (zero or more segments) at the end of a
 * source becomes `/*`, and because `/x/*` does not match a bare `/x`, the
 * zero-segment case gets its own line unless an earlier rule covers it.
 * Permanent is 308, as Next sends.
 *
 * @param {{ source: string, destination: string, permanent: boolean }[]} redirects
 * @returns {[string, string, number][]}
 */
export function toCloudflareRedirects(redirects) {
  /** @type {[string, string, number][]} */
  const rules = [];
  const sources = new Set();
  /** @type {(from: string, to: string, status: number) => void} */
  const add = (from, to, status) => {
    if (sources.has(from)) return;
    sources.add(from);
    rules.push([from, to, status]);
  };
  for (const { source, destination, permanent } of redirects) {
    const status = permanent ? 308 : 307;
    const splat = source.match(/^(.*)\/:([A-Za-z_]\w*)\*$/);
    if (!splat) {
      if (/[:*()?+]/.test(source) || /[:*()?+]/.test(destination)) {
        throw new Error(`redirect pattern _redirects cannot express: ${source} -> ${destination}`);
      }
      add(source, destination, status);
      continue;
    }
    const [, prefix, name] = splat;
    const param = new RegExp(`/?:${name}\\*`);
    if (/[:*()?+]/.test(prefix) || !param.test(destination)) {
      throw new Error(`redirect pattern _redirects cannot express: ${source} -> ${destination}`);
    }
    // Zero segments: /pages → /, /newsletter → /newsletters.
    add(prefix || "/", destination.replace(param, "") || "/", status);
    add(
      `${prefix}/*`,
      destination.replace(param, (m) => (m.startsWith("/") ? "/:splat" : ":splat")),
      status,
    );
  }
  return rules;
}

/**
 * A rule with a placeholder or a splat; Cloudflare counts these separately.
 * @param {[string, string, number]} rule
 */
export function isDynamicRedirect([from]) {
  return from.includes(":") || from.includes("*");
}

/**
 * One `_redirects` line.
 * @param {[string, string, number]} rule
 */
export function redirectLine([from, to, status]) {
  return `${from} ${to} ${status}`;
}

/**
 * Link integrity for the site, in one tool.
 *
 * Default run (wired into `postbuild`, fails the build — all offline and
 * deterministic):
 *
 *   1. Broken routes. An absolute internal link that resolves to no route the
 *      build produced. The recurring bug this was written for: a link points at
 *      content whose frontmatter still says `published: false`, so velite emits
 *      it but getStaticPaths filters it out and the URL 404s in production.
 *   2. Relative markdown links. `booknotes/pixar` resolves against the current
 *      URL, not the site root, so it is a bug even when the target exists.
 *   3. Links to redirect *sources*. `/pages/booknotes` 308s to `/booknotes`;
 *      it works, it costs a hop, and Ahrefs counts it as a broken-ish link. An
 *      audit turned up 39 of these across 25 pages, all hand-fixed — this stops
 *      them coming back, and shouts louder about multi-hop chains.
 *      Markdown is exempt: src/lib/remarkResolveRedirects.ts rewrites those
 *      links to their destination at build time, so short forms such as
 *      `/newsletters/81` are fine in the vault. The check still fails when that
 *      rewrite lands somewhere other than the manifest's final destination, or
 *      when the destination is not a route. TSX hrefs get no rewrite.
 *   4. Missing local assets. Anything under public/ that a page, a component or
 *      a stylesheet references but that does not exist on disk. The KaTeX font
 *      404 the performance audit found was exactly this shape.
 *
 * Advisory output on the same run (never fails): routes nothing links to, and
 * indexable routes missing from the generated sitemap. Some of both are
 * deliberate — see `exclude` in next-sitemap.config.js and
 * src/content/r3f-hidden-routes.json — so this is a list to read, not a gate.
 *
 * `--external` (`npm run checkLinks:external`) is the separate, opt-in network
 * pass over outbound links. It exits 0 unless `--strict`; see links/external.ts
 * for why it must never block a build.
 *
 * Routes come from the Next.js build manifests rather than from the content, so
 * links are compared against the pages the build actually produced. Without
 * `.next` the offline checks skip instead of failing, so `npm run checkLinks`
 * on a cold tree is a no-op.
 */

import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { loadBuildRedirects, resolveInternalHref } from "../lib/remarkResolveRedirects";
import { checkExternalLinks } from "./links/external";
import { collectCoverage } from "./links/orphans";
import { type RedirectRule, resolveRedirectChain } from "./links/redirects";
import {
  CONTENT_DIR,
  collectReferences,
  normalizeRoute,
  PUBLIC_DIR,
  type Reference,
} from "./links/references";
import { collectRoutes, isServable, type Routes } from "./links/routes";

const MAX_ADVISORY_LINES = 30;

type Finding = Reference & { message: string };

function describeChain(hops: string[], truncated: boolean): string {
  const destination = hops[hops.length - 1];
  if (truncated) return `redirect loop — ${hops.join(" → ")}`;
  if (hops.length === 1) return `redirects to ${destination} — link the destination`;
  return `redirects ${hops.length}x (${hops.join(" → ")}) — link ${destination} directly`;
}

function checkRoutes(
  references: Reference[],
  routes: Routes,
  buildRedirects: RedirectRule[],
): Finding[] {
  const findings: Finding[] = [];

  for (const reference of references) {
    const path = normalizeRoute(reference.href);
    if (path === undefined) continue;

    // Redirects run before the filesystem in Next, so a path that matches one
    // never reaches its page even if a page of that name also exists.
    const chain = resolveRedirectChain(path, routes.redirects);
    if (chain) {
      const destination = chain.hops[chain.hops.length - 1];
      if (!isServable(destination, routes)) {
        findings.push({
          ...reference,
          message: `redirects to ${destination}, which is not a route either`,
        });
        continue;
      }
      if (reference.markdown && !chain.truncated) {
        const rewritten = normalizeRoute(resolveInternalHref(path, buildRedirects));
        if (rewritten === destination) continue;
        findings.push({
          ...reference,
          message:
            `redirects to ${destination}, but the markdown build rewrites it to ${rewritten} — ` +
            "remarkResolveRedirects has drifted from the Next redirect table",
        });
        continue;
      }
      findings.push({ ...reference, message: describeChain(chain.hops, chain.truncated) });
      continue;
    }

    if (!isServable(path, routes)) {
      findings.push({ ...reference, message: "no such route" });
    }
  }

  return findings;
}

function checkAssets(references: Reference[]): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const reference of references) {
    const key = `${reference.file}:${reference.line}:${reference.href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (existsSync(resolve(PUBLIC_DIR, `.${reference.href}`))) continue;
    findings.push({
      ...reference,
      message: `no such file — ${relative(process.cwd(), PUBLIC_DIR)}${reference.href} is missing`,
    });
  }
  return findings;
}

function report(title: string, findings: Finding[]) {
  console.error(`\n[checkLinks] ${findings.length} ${title}:\n`);
  for (const { href, file, line, message } of findings) {
    console.error(`  ${file}:${line}  →  ${href}   (${message})`);
  }
}

function advise(title: string, paths: string[], hint: string) {
  if (paths.length === 0) return;
  console.log(`\n[checkLinks] advisory — ${paths.length} ${title}:`);
  for (const path of paths.slice(0, MAX_ADVISORY_LINES)) console.log(`  ${path}`);
  if (paths.length > MAX_ADVISORY_LINES) {
    console.log(`  …and ${paths.length - MAX_ADVISORY_LINES} more`);
  }
  console.log(`  ${hint}`);
}

async function runOffline() {
  const routes = collectRoutes();
  if (!routes) {
    console.log("[checkLinks] no .next manifests — run after `next build`. Skipping.");
    return;
  }

  const references = await collectReferences();
  const broken = checkRoutes(references.routes, routes, loadBuildRedirects(CONTENT_DIR));
  const relativeLinks: Finding[] = references.relative.map((reference) => ({
    ...reference,
    message: "relative link, needs a leading slash",
  }));
  const missingAssets = checkAssets(references.assets);

  const coverage = await collectCoverage(routes);
  if (coverage) {
    advise(
      "route(s) with no internal inlink",
      coverage.orphans,
      "link them from a listing page, or leave them deliberately unlinked.",
    );
    advise(
      "indexable route(s) missing from sitemap.xml",
      coverage.missingFromSitemap,
      "check `exclude` in next-sitemap.config.js and src/content/r3f-hidden-routes.json.",
    );
  }

  const total = broken.length + relativeLinks.length + missingAssets.length;
  if (total === 0) {
    console.log(
      `\n[checkLinks] ${references.routes.length} internal links resolve against ` +
        `${routes.exact.size} routes; ${references.assets.length} asset references exist.`,
    );
    return;
  }

  if (broken.length > 0) report("bad internal link(s)", broken);
  if (relativeLinks.length > 0) report("relative markdown link(s)", relativeLinks);
  if (missingAssets.length > 0) report("missing local asset(s)", missingAssets);
  console.error(
    "\nA link to content with `published: false` in its frontmatter fails here: " +
      "publish the target or drop the link syntax and keep the anchor text.\n" +
      "A TSX link that redirects still works, but costs a hop and reads as broken to " +
      "crawlers: point it at the destination shown above. Markdown links are rewritten " +
      "to their destination at build time and only fail here if that goes wrong.\n",
  );
  process.exit(1);
}

async function runExternal(argv: string[]) {
  const strict = argv.includes("--strict");
  const refresh = argv.includes("--refresh");
  const { external } = await collectReferences();
  const result = await checkExternalLinks(external, { refresh });

  console.log(
    `\n[checkLinks:external] ${result.checked} unique outbound URLs — ` +
      `${result.dead.length} dead, ${result.inconclusive.length} inconclusive.`,
  );
  for (const { url, entry, references } of result.dead) {
    const [first] = references;
    const extra = references.length > 1 ? ` (+${references.length - 1} more)` : "";
    console.log(`  ${first.file}:${first.line}${extra}  →  ${url}   (${entry.status ?? "?"})`);
  }
  console.log(`  report: ${relative(process.cwd(), result.reportPath)}`);

  if (strict && result.dead.length > 0) process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--external")) await runExternal(argv);
  else await runOffline();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

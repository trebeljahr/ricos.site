import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, parse } from "node:path";
import slugify from "@sindresorhus/slugify";
import matter from "gray-matter";
import type { Definition, Link, Root } from "mdast";
import { visit } from "unist-util-visit";
import { newsletterRedirects, STATIC_REDIRECTS } from "../scripts/createRedirects.js";
import {
  compileRedirect,
  type RedirectRule,
  resolveRedirectChain,
} from "../scripts/links/redirects";

/**
 * Lets markdown keep short links such as `/newsletters/81` or `/pages/now`
 * while the shipped HTML links the canonical URL, so readers and crawlers
 * never take a redirect hop from an internal link.
 *
 * The rules are the same table next.config.mjs serves. Next reads the
 * newsletter numbers from `.velite/newsletters.json`, which does not exist yet
 * while velite is building it, so here they come straight from the markdown —
 * the same stem and slugified title velite derives. `checkLinks` compares the
 * result against the routes manifest after the build and fails on any drift.
 */

let cache: { key: number; rules: RedirectRule[] } | undefined;

export function loadBuildRedirects(contentDir: string): RedirectRule[] {
  const newslettersDir = join(contentDir, "newsletters");
  // Adding or removing a newsletter bumps the directory mtime; a retitled one
  // keeps the old slug until the next process, which checkLinks would catch.
  const key = statSync(newslettersDir).mtimeMs;
  if (cache?.key === key) return cache.rules;

  const newsletters = readdirSync(newslettersDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const { data } = matter(readFileSync(join(newslettersDir, file), "utf-8"));
      return { number: parse(file).name, slugTitle: slugify(String(data.title ?? "")) };
    });

  const rules = [...newsletterRedirects(newsletters), ...STATIC_REDIRECTS].map(compileRedirect);
  cache = { key, rules };
  return rules;
}

/**
 * The canonical form of an internal href, keeping its query and fragment.
 * Returns the href unchanged when it is external, relative, already canonical,
 * or caught in a redirect loop.
 */
export function resolveInternalHref(href: string, rules: RedirectRule[]): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const suffixStart = href.search(/[?#]/);
  const path = suffixStart === -1 ? href : href.slice(0, suffixStart);
  const suffix = suffixStart === -1 ? "" : href.slice(suffixStart);

  const chain = resolveRedirectChain(path, rules);
  if (!chain || chain.truncated) return href;
  return chain.hops[chain.hops.length - 1] + suffix;
}

export function remarkResolveRedirects({ contentDir }: { contentDir: string }) {
  return (tree: Root) => {
    const rules = loadBuildRedirects(contentDir);
    const resolve = (node: Link | Definition) => {
      node.url = resolveInternalHref(node.url, rules);
    };
    visit(tree, "link", resolve);
    visit(tree, "definition", resolve);
  };
}

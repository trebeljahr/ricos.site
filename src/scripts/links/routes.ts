/**
 * Everything the build says it will serve, read out of the Next.js manifests
 * rather than re-derived from the content, so the checker compares links
 * against the pages the build actually produced.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { RedirectRule } from "./redirects";
import { ROOT } from "./references";

export const NEXT_DIR = resolve(ROOT, ".next");
export const PAGES_DIR = resolve(NEXT_DIR, "server/pages");

export type Routes = {
  /** Prerendered pages and non-SSG page routes, by exact path. */
  exact: Set<string>;
  /** Dynamic routes that still render on demand (`fallback` other than false). */
  patterns: RegExp[];
  redirects: RedirectRule[];
};

export function readJson<T>(path: string): T | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function collectRoutes(): Routes | undefined {
  type RoutesManifest = {
    staticRoutes?: { page: string }[];
    dynamicRoutes?: { page: string; regex: string }[];
    redirects?: RedirectRule[];
  };
  type PrerenderManifest = {
    routes?: Record<string, unknown>;
    dynamicRoutes?: Record<string, { fallback?: string | false | null }>;
  };

  const routesManifest = readJson<RoutesManifest>(resolve(NEXT_DIR, "routes-manifest.json"));
  const prerenderManifest = readJson<PrerenderManifest>(
    resolve(NEXT_DIR, "prerender-manifest.json"),
  );
  if (!routesManifest || !prerenderManifest) return undefined;

  const exact = new Set<string>();
  for (const route of Object.keys(prerenderManifest.routes ?? {})) exact.add(route);
  for (const { page } of routesManifest.staticRoutes ?? []) exact.add(page);

  const patterns: RegExp[] = [];
  const fallbacks = prerenderManifest.dynamicRoutes ?? {};
  for (const { page, regex } of routesManifest.dynamicRoutes ?? []) {
    // `fallback: false` means the route only serves the paths getStaticPaths
    // returned, which are already in `exact`. Anything else renders on demand.
    if (fallbacks[page]?.fallback === false) continue;
    patterns.push(new RegExp(regex));
  }

  return { exact, patterns, redirects: routesManifest.redirects ?? [] };
}

export function isServable(path: string, routes: Routes): boolean {
  if (routes.exact.has(path)) return true;
  return routes.patterns.some((pattern) => pattern.test(path));
}

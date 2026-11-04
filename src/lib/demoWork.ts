// When each rejected demo was last worked on, read from git. Server-only.
//
// A demo's files are its page and what that page imports inside the computer
// folders, followed through. A module many demos share is left out: touching the
// nav must not send every rejected demo back to the queue. So a change only in a
// widely shared module does not re-queue a demo; clicking Rejected again does.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { computerDemos } from "./computerDemos";
import type { DemoReviews, DemoWork } from "./demoReview";

/** A module reached by more demos than this counts as shared, not as that demo's. */
const SHARED_LIMIT = 5;

const FOLLOWED = [
  path.join("src", "components", "computer") + path.sep,
  path.join("src", "lib", "computer") + path.sep,
];
const IMPORT = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
const EXTENSIONS = [".tsx", ".ts", "/index.tsx", "/index.ts"];

function resolveImport(from: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith(".")) base = path.join(path.dirname(from), specifier);
  else if (specifier.startsWith("@components/"))
    base = path.join("src", "components", specifier.slice("@components/".length));
  else if (specifier.startsWith("src/")) base = specifier;
  else return null;
  if (!FOLLOWED.some((folder) => base.startsWith(folder))) return null;
  const candidates = [base, ...EXTENSIONS.map((extension) => base + extension)];
  return candidates.find((file) => fs.existsSync(file) && fs.statSync(file).isFile()) ?? null;
}

function importsOf(file: string): string[] {
  const targets: string[] = [];
  for (const [, specifier] of fs.readFileSync(file, "utf8").matchAll(IMPORT)) {
    const target = resolveImport(file, specifier);
    if (target) targets.push(target);
  }
  return targets;
}

function reachedFrom(page: string): Set<string> {
  const reached = new Set([page]);
  const waiting = [page];
  for (let file = waiting.pop(); file; file = waiting.pop()) {
    for (const target of importsOf(file)) {
      if (!reached.has(target)) {
        reached.add(target);
        waiting.push(target);
      }
    }
  }
  return reached;
}

function countUses(lists: Iterable<string>[]): Map<string, number> {
  const uses = new Map<string, number>();
  for (const files of lists) {
    for (const file of new Set(files)) uses.set(file, (uses.get(file) ?? 0) + 1);
  }
  return uses;
}

/** The files that count as work on each demo. */
export function demoFiles(): Record<string, string[]> {
  const pages = computerDemos.map(({ slug }) => ({
    slug,
    page: path.join("src", "pages", "computer", `${slug}.tsx`),
  }));
  const direct = pages.map(({ page }) => importsOf(page));
  const reached = pages.map(({ page }) => reachedFrom(page));
  const directUses = countUses(direct);
  const reachedUses = countUses(reached);
  // What a page imports itself is that demo's, however many other demos reach it
  // through a loader or a shared module. The nav fails this: every page imports it.
  return Object.fromEntries(
    pages.map(({ slug, page }, index) => [
      slug,
      [...reached[index]].filter(
        (file) =>
          file === page ||
          (reachedUses.get(file) ?? 0) <= SHARED_LIMIT ||
          (direct[index].includes(file) && (directUses.get(file) ?? 0) <= SHARED_LIMIT),
      ),
    ]),
  );
}

function lastCommit(files: string[]): number | null {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", ...files], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out ? Number(out) * 1000 : null;
  } catch {
    return null;
  }
}

/** Last commit per rejected demo. Git only runs for those, and not at all with none. */
export function readDemoWork(reviews: DemoReviews): DemoWork {
  const rejected = Object.keys(reviews).filter((slug) => reviews[slug].verdict === "rejected");
  if (rejected.length === 0) return {};
  const files = demoFiles();
  const work: DemoWork = {};
  for (const slug of rejected) {
    const time = files[slug] ? lastCommit(files[slug]) : null;
    if (time) work[slug] = time;
  }
  return work;
}

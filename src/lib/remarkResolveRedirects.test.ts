import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Root } from "mdast";
import { describe, expect, it } from "vitest";
import {
  loadBuildRedirects,
  remarkResolveRedirects,
  resolveInternalHref,
} from "./remarkResolveRedirects";

function contentDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "resolve-redirects-"));
  mkdirSync(join(dir, "newsletters"));
  writeFileSync(
    join(dir, "newsletters", "81.md"),
    '---\ntitle: "The Guilt of Leaving Home Again"\n---\nBody\n',
  );
  return dir;
}

describe("resolveInternalHref", () => {
  const rules = loadBuildRedirects(contentDir());

  it("resolves a numeric newsletter link to its slug", () => {
    expect(resolveInternalHref("/newsletters/81", rules)).toBe(
      "/newsletters/the-guilt-of-leaving-home-again",
    );
    expect(resolveInternalHref("/81", rules)).toBe("/newsletters/the-guilt-of-leaving-home-again");
  });

  it("follows static rules and multi-hop chains", () => {
    expect(resolveInternalHref("/pages/now", rules)).toBe("/now");
    expect(resolveInternalHref("/pages/newsletter/81", rules)).toBe(
      "/newsletters/the-guilt-of-leaving-home-again",
    );
  });

  it("keeps the query and fragment", () => {
    expect(resolveInternalHref("/newsletters/81#coda", rules)).toBe(
      "/newsletters/the-guilt-of-leaving-home-again#coda",
    );
    expect(resolveInternalHref("/pages/now?x=1", rules)).toBe("/now?x=1");
  });

  it("leaves canonical, external and relative hrefs alone", () => {
    expect(resolveInternalHref("/newsletters/82", rules)).toBe("/newsletters/82");
    expect(resolveInternalHref("/booknotes", rules)).toBe("/booknotes");
    expect(resolveInternalHref("https://example.com/pages/x", rules)).toBe(
      "https://example.com/pages/x",
    );
    expect(resolveInternalHref("//example.com/pages/x", rules)).toBe("//example.com/pages/x");
    expect(resolveInternalHref("#pages", rules)).toBe("#pages");
  });
});

describe("remarkResolveRedirects", () => {
  it("rewrites link and definition urls", () => {
    const tree: Root = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "link", url: "/newsletters/81", children: [{ type: "text", value: "81" }] },
          ],
        },
        { type: "definition", identifier: "now", label: "now", url: "/pages/now" },
      ],
    };
    remarkResolveRedirects({ contentDir: contentDir() })(tree);
    expect(tree).toMatchObject({
      children: [
        { children: [{ url: "/newsletters/the-guilt-of-leaving-home-again" }] },
        { url: "/now" },
      ],
    });
  });
});

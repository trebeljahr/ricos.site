import { describe, expect, it } from "vitest";
import {
  applyRedirect,
  compileRedirect,
  type RedirectRule,
  resolveRedirectChain,
} from "./redirects";

/**
 * Shapes copied verbatim out of .next/routes-manifest.json so the tests break
 * if Next ever changes how it compiles `source` into `regex`.
 */
const TRAILING_SLASH: RedirectRule = {
  source: "/:path+/",
  destination: "/:path+",
  internal: true,
  regex: "^(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))/$",
};
const NEWSLETTER_NUMBER: RedirectRule = {
  source: "/newsletters/1",
  destination: "/newsletters/sketchplanations-ai-and-armageddon",
  regex: "^(?!/_next)/newsletters/1(?:/)?$",
};
const NEWSLETTER_SINGULAR: RedirectRule = {
  source: "/newsletter",
  destination: "/newsletters",
  regex: "^(?!/_next)/newsletter(?:/)?$",
};
const NEWSLETTER_SINGULAR_ID: RedirectRule = {
  source: "/newsletter/:id*",
  destination: "/newsletters/:id*",
  regex: "^(?!/_next)/newsletter(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$",
};
const PAGES: RedirectRule = {
  source: "/pages/:id*",
  destination: "/:id*",
  regex: "^(?!/_next)/pages(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?(?:/)?$",
};

const RULES = [
  TRAILING_SLASH,
  NEWSLETTER_NUMBER,
  NEWSLETTER_SINGULAR,
  NEWSLETTER_SINGULAR_ID,
  PAGES,
];

describe("applyRedirect", () => {
  it("substitutes a catch-all param positionally", () => {
    expect(applyRedirect("/pages/booknotes", PAGES)).toBe("/booknotes");
    expect(applyRedirect("/pages/travel/japan", PAGES)).toBe("/travel/japan");
  });

  it("collapses the empty match of an optional param", () => {
    expect(applyRedirect("/pages", PAGES)).toBe("/");
  });

  it("returns undefined when the rule does not match", () => {
    expect(applyRedirect("/booknotes", PAGES)).toBeUndefined();
  });

  it("does not let :id eat the start of a longer param name", () => {
    const rule: RedirectRule = {
      source: "/a/:id/:idx",
      destination: "/b/:idx/:id",
      regex: "^/a/([^/]+?)/([^/]+?)$",
    };
    expect(applyRedirect("/a/one/two", rule)).toBe("/b/two/one");
  });
});

describe("resolveRedirectChain", () => {
  it("reports a single hop", () => {
    expect(resolveRedirectChain("/pages/booknotes", RULES)).toEqual({
      hops: ["/booknotes"],
      truncated: false,
    });
  });

  it("follows a multi-hop chain to its final destination", () => {
    // /pages/newsletter → /newsletter → /newsletters
    expect(resolveRedirectChain("/pages/newsletter", RULES)).toEqual({
      hops: ["/newsletter", "/newsletters"],
      truncated: false,
    });
  });

  it("returns undefined for a path that is already canonical", () => {
    expect(resolveRedirectChain("/booknotes", RULES)).toBeUndefined();
    expect(
      resolveRedirectChain("/newsletters/sketchplanations-ai-and-armageddon", RULES),
    ).toBeUndefined();
  });

  it("resolves a numeric newsletter link straight to its slug", () => {
    expect(resolveRedirectChain("/newsletters/1", RULES)).toEqual({
      hops: ["/newsletters/sketchplanations-ai-and-armageddon"],
      truncated: false,
    });
  });

  it("ignores Next's internal trailing-slash rule", () => {
    expect(resolveRedirectChain("/booknotes/", [TRAILING_SLASH])).toBeUndefined();
  });

  it("stops and flags a redirect loop", () => {
    const loop: RedirectRule[] = [
      { source: "/a", destination: "/b", regex: "^/a$" },
      { source: "/b", destination: "/a", regex: "^/b$" },
    ];
    expect(resolveRedirectChain("/a", loop)).toEqual({ hops: ["/b", "/a"], truncated: true });
  });
});

describe("compileRedirect", () => {
  it("produces the regex Next writes to the routes manifest", () => {
    for (const rule of [NEWSLETTER_NUMBER, NEWSLETTER_SINGULAR, NEWSLETTER_SINGULAR_ID, PAGES]) {
      expect(compileRedirect(rule).regex).toBe(rule.regex);
    }
    expect(compileRedirect({ source: "/feed.xml", destination: "/rss.xml" }).regex).toBe(
      "^(?!/_next)/feed\\.xml(?:/)?$",
    );
  });

  it("compiles single-segment and optional params", () => {
    const rule = compileRedirect({ source: "/a/:id/:rest?", destination: "/b/:id/:rest?" });
    expect(applyRedirect("/a/one", rule)).toBe("/b/one");
    expect(applyRedirect("/a/one/two", rule)).toBe("/b/one/two");
    expect(applyRedirect("/a/one/two/three", rule)).toBeUndefined();
  });

  it("refuses patterns it cannot compile the way Next does", () => {
    expect(() => compileRedirect({ source: "/a-:id", destination: "/b" })).toThrow();
    expect(() => compileRedirect({ source: "/a/:id(\\d+)", destination: "/b" })).toThrow();
  });
});

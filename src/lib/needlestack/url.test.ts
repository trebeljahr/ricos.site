import { describe, expect, it } from "vitest";

import { inferType, isBlocked, needleId, normalizeUrl } from "./url";

const norm = (url: string) => normalizeUrl(url) as string;

describe("normalizeUrl", () => {
  it("collapses the ways the same YouTube video gets bookmarked", () => {
    const canonical = "https://youtube.com/watch?v=Xc4xYacTu-E";
    expect(norm("https://www.youtube.com/watch?v=Xc4xYacTu-E&t=247s")).toBe(canonical);
    expect(norm("https://youtu.be/Xc4xYacTu-E?si=abc123")).toBe(canonical);
    expect(norm("https://music.youtube.com/watch?v=Xc4xYacTu-E&feature=share")).toBe(canonical);
    // A video opened from inside a playlist is still that video.
    expect(norm("https://www.youtube.com/watch?v=Xc4xYacTu-E&list=PL848F2368C90DDC3D")).toBe(
      canonical,
    );
  });

  it("keeps a playlist separate from its videos", () => {
    expect(norm("https://www.youtube.com/playlist?list=PL848F2368C90DDC3D")).toBe(
      "https://youtube.com/playlist?list=PL848F2368C90DDC3D",
    );
  });

  it("drops tracking parameters but keeps content ones", () => {
    expect(norm("https://fs.blog/newsletter/?utm_source=twitter&fbclid=x")).toBe(
      "https://fs.blog/newsletter",
    );
    expect(norm("https://news.ycombinator.com/item?id=30822339")).toBe(
      "https://news.ycombinator.com/item?id=30822339",
    );
  });

  it("refuses anything that is not an http(s) link", () => {
    expect(normalizeUrl("javascript:void(0)")).toBeUndefined();
    expect(normalizeUrl("place:sort=8")).toBeUndefined();
    expect(normalizeUrl("")).toBeUndefined();
  });

  it("gives the same id to two spellings of one link", () => {
    expect(needleId(norm("https://youtu.be/abc?si=1"))).toBe(
      needleId(norm("https://www.youtube.com/watch?v=abc")),
    );
  });
});

describe("inferType", () => {
  it("reads the type off the URL shape", () => {
    expect(inferType(norm("https://www.youtube.com/watch?v=abc"))).toBe("video");
    expect(inferType(norm("https://www.youtube.com/playlist?list=abc"))).toBe("playlist");
    expect(inferType(norm("https://www.youtube.com/c/inanutshell"))).toBe("channel");
    expect(inferType(norm("https://github.com/sindresorhus/awesome"))).toBe("repo");
    expect(inferType(norm("https://arxiv.org/abs/1706.03762"))).toBe("paper");
    expect(inferType(norm("https://ocw.mit.edu/courses/18-04"))).toBe("lecture");
    expect(inferType(norm("https://ncase.me/trust/"))).toBe("interactive");
    expect(inferType(norm("https://waitbutwhy.com/2015/12/the-tail-end.html"))).toBe("article");
  });

  it("treats a bare domain as a site, not an article", () => {
    expect(inferType(norm("https://sive.rs/"))).toBe("other");
    expect(inferType(norm("https://example.com/"), "Some Blog")).toBe("blog");
  });
});

describe("isBlocked", () => {
  it("keeps shadow libraries, streaming and private accounts out", () => {
    expect(isBlocked(norm("https://libgen.is/search.php?req=x"))).toBe(true);
    expect(isBlocked(norm("https://hianime.to/watch/x"))).toBe(true);
    expect(isBlocked(norm("https://banking.dkb.de/"))).toBe(true);
    expect(isBlocked(norm("https://www.reddit.com/r/Piracy/wiki/megathread"))).toBe(true);
  });

  it("leaves ordinary links alone", () => {
    expect(isBlocked(norm("https://waitbutwhy.com/2015/12/the-tail-end.html"))).toBe(false);
    expect(isBlocked(norm("https://youtube.com/watch?v=abc"), "Some Video")).toBe(false);
  });
});

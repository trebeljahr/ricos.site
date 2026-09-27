import { describe, expect, it } from "vitest";

import {
  cleanTitle,
  faviconFrom,
  metaFromHtml,
  minutesFrom,
  parseDuration,
  youtubeThumbnail,
} from "./meta";

const page = `<!doctype html><html lang="en"><head>
  <title>Fallback title — Example</title>
  <meta name="description" content="A weaker description">
  <meta property="og:title" content="The Real Title">
  <meta content="Something the page says about itself" property="og:description">
  <meta property="og:site_name" content="Example Blog">
  <meta property="og:image" content="/img/cover.png">
  <meta property="og:image:alt" content="A cover">
  <meta property="article:published_time" content="2024-03-02T10:00:00Z">
  <link rel="icon" href="/favicon-32.png">
  <link rel="canonical" href="https://example.com/post">
  <script type="application/ld+json">
    {"@type":"Article","author":{"name":"Jane Roe"},"duration":"PT12M30S"}
  </script>
</head><body><script>var x = "ignored";</script><p>${"word ".repeat(440)}</p></body></html>`;

describe("metaFromHtml", () => {
  const meta = metaFromHtml(page, "https://example.com/post?utm=1");

  it("prefers what the page declares over its <title>", () => {
    expect(meta.title).toBe("The Real Title");
    expect(meta.description).toBe("Something the page says about itself");
    expect(meta.siteName).toBe("Example Blog");
  });

  it("reads meta tags whatever order the attributes are in", () => {
    expect(metaFromHtml('<meta content="X" property="og:title">', "https://a.b").title).toBe("X");
  });

  it("resolves images, icons and canonicals against the page", () => {
    expect(meta.image).toBe("https://example.com/img/cover.png");
    expect(meta.imageAlt).toBe("A cover");
    expect(meta.favicon).toBe("https://example.com/favicon-32.png");
    expect(meta.canonical).toBe("https://example.com/post");
  });

  it("falls back to JSON-LD for author and duration", () => {
    expect(meta.author).toBe("Jane Roe");
    expect(meta.durationSeconds).toBe(750);
  });

  it("counts words without counting the scripts", () => {
    expect(meta.words).toBe(440);
    expect(meta.publishedAt).toBe("2024-03-02T10:00:00Z");
    expect(meta.lang).toBe("en");
  });

  it("falls back to the conventional favicon", () => {
    expect(faviconFrom("<html></html>", "https://example.com/deep/page")).toBe(
      "https://example.com/favicon.ico",
    );
  });
});

describe("parseDuration", () => {
  it("reads every shape a page states a length in", () => {
    expect(parseDuration("PT1H2M10S")).toBe(3730);
    expect(parseDuration("PT45S")).toBe(45);
    expect(parseDuration("12:30")).toBe(750);
    expect(parseDuration("1:02:10")).toBe(3730);
    expect(parseDuration("336")).toBe(336);
    expect(parseDuration(336)).toBe(336);
  });

  it("refuses nonsense instead of guessing", () => {
    expect(parseDuration("soon")).toBeUndefined();
    expect(parseDuration("")).toBeUndefined();
    expect(parseDuration(undefined)).toBeUndefined();
  });
});

describe("minutesFrom", () => {
  it("uses a real length before a word count", () => {
    expect(minutesFrom({ durationSeconds: 1181, words: 28 })).toBe(20);
    expect(minutesFrom({ words: 2901 })).toBe(13);
  });

  it("stays quiet about pages too short to have a reading time", () => {
    // A login wall or a link list: a "1 min" badge would be data-shaped fiction.
    expect(minutesFrom({ words: 94 })).toBeUndefined();
    expect(minutesFrom({})).toBeUndefined();
  });
});

describe("cleanTitle", () => {
  it("strips the noise bookmark titles carry", () => {
    expect(cleanTitle("(32) Answering Your Questions - YouTube")).toBe("Answering Your Questions");
    expect(cleanTitle("The Tail End — Wait But Why")).toBe("The Tail End — Wait But Why");
    expect(cleanTitle("Fourier transform - Wikipedia")).toBe("Fourier transform");
    expect(cleanTitle("  spaced   out  ")).toBe("spaced out");
  });

  it("gives nothing back rather than an empty title", () => {
    expect(cleanTitle("   ")).toBeUndefined();
    expect(cleanTitle(undefined)).toBeUndefined();
  });
});

describe("youtubeThumbnail", () => {
  it("builds the thumbnail from the video id, without a request", () => {
    expect(youtubeThumbnail("https://youtube.com/watch?v=Xc4xYacTu-E")).toBe(
      "https://i.ytimg.com/vi/Xc4xYacTu-E/hqdefault.jpg",
    );
  });

  it("has nothing to offer for other hosts or for playlists", () => {
    expect(youtubeThumbnail("https://youtube.com/playlist?list=PL123")).toBeUndefined();
    expect(youtubeThumbnail("https://vimeo.com/123")).toBeUndefined();
  });
});

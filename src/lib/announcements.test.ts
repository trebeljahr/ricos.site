import { describe, expect, it } from "vitest";
import { ANNOUNCEMENTS, publishedAnnouncements, resolveAnnouncement } from "./announcements";
import { announcementsFeed } from "./announcementsFeed";
import { PROJECTS } from "./projects";

const conv3d = PROJECTS.find((p) => p.slug === "conv3d");

describe("announcements", () => {
  it("every entry names a project and has a valid date", () => {
    for (const entry of ANNOUNCEMENTS) expect(() => resolveAnnouncement(entry)).not.toThrow();
  });

  it("takes title, card text and link from the project unless overridden", () => {
    expect(resolveAnnouncement({ slug: "conv3d", date: "2026-10-27" })).toMatchObject({
      title: conv3d?.title,
      summary: conv3d?.subtitle,
      link: conv3d?.link,
    });
    expect(
      resolveAnnouncement({ slug: "conv3d", date: "2026-10-27", title: "conv3D 1.0" }).title,
    ).toBe("conv3D 1.0");
    expect(() => resolveAnnouncement({ slug: "nope", date: "2026-10-27" })).toThrow(/nope/);
    expect(() => resolveAnnouncement({ slug: "conv3d", date: "soon" })).toThrow(/date/);
  });

  it("keeps an entry out until its time has passed, newest first", () => {
    const entries = [
      { slug: "tiao", date: "2026-01-01" },
      { slug: "conv3d", date: "2026-10-27T16:00:00Z" },
    ];
    expect(
      publishedAnnouncements(entries, new Date("2026-10-27T15:59:59Z")).map((a) => a.slug),
    ).toEqual(["tiao"]);
    expect(
      publishedAnnouncements(entries, new Date("2026-10-27T16:00:00Z")).map((a) => a.slug),
    ).toEqual(["conv3d", "tiao"]);
  });
});

describe("announcementsFeed", () => {
  const site = "https://ricos.site";

  it("is RSS 2.0 with a self link and one item per published entry", () => {
    const xml = announcementsFeed(
      [{ slug: "conv3d", date: "2026-10-27T16:00:00Z" }],
      new Date("2026-10-28T00:00:00Z"),
      site,
    );
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="utf-8"\?>\s*<rss version="2.0"/);
    expect(xml).toContain('<atom:link href="https://ricos.site/projects/rss.xml" rel="self"');
    expect(xml).toContain("<link>https://ricos.site/projects</link>");
    expect(xml.match(/<item>/g)).toHaveLength(1);
    expect(xml).toContain(`<link>${conv3d?.link}</link>`);
    expect(xml).toContain("<pubDate>Tue, 27 Oct 2026 16:00:00 GMT</pubDate>");
  });

  it("is a valid, empty channel before the first entry is out", () => {
    const xml = announcementsFeed(
      [{ slug: "conv3d", date: "2026-10-27T16:00:00Z" }],
      new Date("2026-10-20T00:00:00Z"),
      site,
    );
    expect(xml).toContain("<title>New things from Rico</title>");
    expect(xml).not.toContain("<item>");
  });
});

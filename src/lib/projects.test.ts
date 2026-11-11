import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FEATURED_PROJECTS, PROJECT_SECTIONS, PROJECTS, projectsInSection } from "./projects";

// Pixel size from a WebP header (lossy VP8, lossless VP8L or extended VP8X).
function webpSize(bytes: Buffer): { width: number; height: number } {
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  }
  throw new Error(`Not a WebP file (${chunk})`);
}

const INTERNAL_ROUTES = ["/r3f", "/1-month-projects", "/achievements", "/midjourney"];

describe("projects catalogue", () => {
  it("has unique slugs", () => {
    const slugs = PROJECTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("points every cover and wordmark card at an existing 1200x630 file in public/", () => {
    for (const { cover, wordmarkCover, slug } of PROJECTS) {
      for (const image of wordmarkCover ? [cover, wordmarkCover] : [cover]) {
        const path = resolve("public", `.${image.src}`);
        expect(existsSync(path), image.src).toBe(true);
        expect(webpSize(readFileSync(path)), image.src).toEqual({
          width: image.width,
          height: image.height,
        });
        expect(image.alt.trim(), slug).not.toBe("");
      }
    }
  });

  it("keeps the text-free cover and the wordmark card as two files", () => {
    for (const { cover, wordmarkCover, slug } of PROJECTS) {
      if (!wordmarkCover) continue;
      expect(cover.src, slug).toBe(`/projects/${slug}.webp`);
      expect(wordmarkCover.src, slug).toBe(`/projects/${slug}-wordmark.webp`);
    }
  });

  it("links to https sites or known internal routes", () => {
    for (const { link, slug } of PROJECTS) {
      if (!link.startsWith("https://")) expect(INTERNAL_ROUTES, slug).toContain(link);
    }
  });

  it("assigns every project to a known section with content", () => {
    const titles = PROJECT_SECTIONS.map((s) => s.title);
    for (const p of PROJECTS) expect(titles, p.slug).toContain(p.section);
    for (const t of titles)
      expect(
        PROJECTS.some((p) => p.section === t),
        t,
      ).toBe(true);
  });

  it("orders sections by Rico's ranking: games and explorables, dev tools, everyday apps", () => {
    expect(PROJECT_SECTIONS.map((s) => s.title)).toEqual([
      "Games",
      "Art & 3D",
      "Dev tools",
      "Everyday apps",
    ]);
  });

  it("keeps unlisted projects off every public list", () => {
    const unlisted = PROJECTS.filter((p) => p.unlisted).map((p) => p.slug);
    const listed = [
      ...PROJECT_SECTIONS.flatMap(({ title }) => projectsInSection(title)),
      ...FEATURED_PROJECTS,
    ].map((p) => p.slug);
    for (const slug of unlisted) expect(listed, slug).not.toContain(slug);
    for (const { title } of PROJECT_SECTIONS)
      expect(projectsInSection(title), title).not.toEqual([]);
  });

  it("lists each section newest first", () => {
    for (const { title } of PROJECT_SECTIONS) {
      const dates = projectsInSection(title).map((p) => p.date);
      expect(dates, title).toEqual([...dates].sort().reverse());
    }
  });

  it("records a real start date for the timeline", () => {
    for (const { date, slug } of PROJECTS) {
      expect(date, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(date)), slug).toBe(false);
    }
  });

  it("dates every sprint after the project start, oldest first", () => {
    for (const { date, slug, sprints = [] } of PROJECTS) {
      let previous = date;
      for (const sprint of sprints) {
        expect(sprint.date, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(sprint.date > previous, slug).toBe(true);
        expect(sprint.summary.trim(), slug).not.toBe("");
        previous = sprint.date;
      }
    }
  });

  it("features between 3 and 6 projects, in multiples of 3", () => {
    expect(FEATURED_PROJECTS.length).toBeGreaterThanOrEqual(3);
    expect(FEATURED_PROJECTS.length).toBeLessThanOrEqual(6);
    expect(FEATURED_PROJECTS.length % 3).toBe(0);
  });
});

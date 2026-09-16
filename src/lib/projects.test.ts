import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FEATURED_PROJECTS, PROJECT_SECTIONS, PROJECTS } from "./projects";

const INTERNAL_ROUTES = ["/r3f", "/1-month-projects", "/achievements", "/midjourney"];

describe("projects catalogue", () => {
  it("has unique slugs", () => {
    const slugs = PROJECTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("points every image at an existing file in public/", () => {
    for (const { image, slug } of PROJECTS) {
      if (!image) continue;
      expect(existsSync(resolve("public", `.${image.src}`)), slug).toBe(true);
      expect(image.alt.trim(), slug).not.toBe("");
    }
  });

  it("marks external links consistently", () => {
    for (const { href, external, slug } of PROJECTS) {
      expect(external, slug).toBe(/^https?:\/\//.test(href));
      if (!external) expect(INTERNAL_ROUTES, slug).toContain(href);
    }
  });

  it("uses https source links", () => {
    for (const { sourceUrl, slug } of PROJECTS) {
      if (sourceUrl) expect(sourceUrl, slug).toMatch(/^https:\/\//);
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

  it("features between 3 and 6 projects, in multiples of 3", () => {
    expect(FEATURED_PROJECTS.length).toBeGreaterThanOrEqual(3);
    expect(FEATURED_PROJECTS.length).toBeLessThanOrEqual(6);
    expect(FEATURED_PROJECTS.length % 3).toBe(0);
  });
});

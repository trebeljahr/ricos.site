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

  it("points every cover at an existing file in public/", () => {
    for (const { cover, slug } of PROJECTS) {
      expect(existsSync(resolve("public", `.${cover.src}`)), slug).toBe(true);
      expect(cover.alt.trim(), slug).not.toBe("");
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

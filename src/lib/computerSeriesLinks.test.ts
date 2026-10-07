import { describe, expect, it } from "vitest";
import { setNavLinks } from "./computerSeriesLinks";

const file = `---\ntitle: "Bits"\norder: 2\nstatus: idea\n---\n\n## First\n\nSome text.\n`;

describe("setNavLinks", () => {
  it("appends the links to the frontmatter and leaves the body alone", () => {
    const out = setNavLinks(file, {
      prev: "[[1.0-tour|1.0 Tour]]",
      next: "[[1.2-gates]]",
      up: "[[index]]",
    });
    expect(out).toBe(
      `---\ntitle: "Bits"\norder: 2\nstatus: idea\nprev: "[[1.0-tour|1.0 Tour]]"\nnext: "[[1.2-gates]]"\nup: "[[index]]"\n---\n\n## First\n\nSome text.\n`,
    );
  });

  it("replaces old links on a rerun and drops ones that no longer apply", () => {
    const once = setNavLinks(file, { prev: "[[a]]", next: "[[b]]", up: "[[index]]" });
    const twice = setNavLinks(once, { next: "[[c]]", up: "[[index]]" });
    expect(twice).toBe(setNavLinks(file, { next: "[[c]]", up: "[[index]]" }));
    expect(setNavLinks(twice, { next: "[[c]]", up: "[[index]]" })).toBe(twice);
  });

  it("refuses a file without frontmatter", () => {
    expect(() => setNavLinks("## No frontmatter\n", {})).toThrow();
  });
});

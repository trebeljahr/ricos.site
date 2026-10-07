import { describe, expect, it } from "vitest";
import { navBlock, setNavLinks, stripNav } from "./computerSeriesLinks";

const file = `---\ntitle: "Bits"\norder: 2\n---\n\n## First\n\nSome text.\n`;
const links = {
  prev: "[[1.0-tour|1.0 Tour]]",
  up: "[[index|Index]]",
  next: "[[1.2-gates|1.2 Gates]]",
};

describe("navBlock", () => {
  it("puts prev, up and next on one line between two comments", () => {
    expect(navBlock(links).split("\n")[1]).toBe(
      "← [[1.0-tour|1.0 Tour]] · ↑ [[index|Index]] · [[1.2-gates|1.2 Gates]] →",
    );
    expect(navBlock({ up: "[[index]]" }).split("\n")[1]).toBe("↑ [[index]]");
  });
});

describe("setNavLinks", () => {
  it("adds a block under the frontmatter and one at the end, keeping the text between", () => {
    const out = setNavLinks(file, links);
    const block = navBlock(links);
    expect(out).toBe(
      `---\ntitle: "Bits"\norder: 2\n---\n\n${block}\n\n## First\n\nSome text.\n\n${block}\n`,
    );
    expect(stripNav(out.split("---\n")[2]).trim()).toBe("## First\n\nSome text.");
  });

  it("rewrites existing blocks in place and is stable on a rerun", () => {
    const once = setNavLinks(file, links);
    const moved = setNavLinks(once, { up: "[[index]]" });
    expect(moved.match(/↑ \[\[index\]\]\n/g)).toHaveLength(2);
    expect(moved).not.toContain("1.0 Tour");
    expect(setNavLinks(moved, { up: "[[index]]" })).toBe(moved);
  });

  it("keeps a block deleted by hand deleted", () => {
    const once = setNavLinks(file, links);
    const bottomRemoved = once.slice(0, once.lastIndexOf("<!-- nav"));
    expect(setNavLinks(bottomRemoved, links).match(/<!-- nav/g)).toHaveLength(1);
  });

  it("drops the frontmatter links an earlier version wrote", () => {
    const old = `---\ntitle: "Bits"\nprev: "[[a]]"\nnext: "[[b]]"\nup: "[[index]]"\n---\n\nText.\n`;
    expect(setNavLinks(old, links)).not.toMatch(/^(prev|next|up):/m);
  });

  it("repairs a closing comment that lost its > at the end of the file", () => {
    const once = setNavLinks(file, links);
    const cut = once.trimEnd().slice(0, -1);
    expect(stripNav(cut)).not.toContain("<!--");
    expect(setNavLinks(cut, links)).toBe(once.trimEnd());
  });

  it("refuses a file without frontmatter", () => {
    expect(() => setNavLinks("## No frontmatter\n", {})).toThrow();
  });
});

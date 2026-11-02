import type { Root } from "hast";
import { describe, expect, it } from "vitest";
import { rehypeHeadingOrder } from "./rehypeHeadingOrder";

const render = (...levels: number[]) => {
  const tree: Root = {
    type: "root",
    children: levels.map((level) => ({
      type: "element",
      tagName: `h${level}`,
      properties: {},
      children: [],
    })),
  };
  rehypeHeadingOrder()(tree);
  return tree.children.map((node) => (node.type === "element" ? node.tagName : ""));
};

describe("rehypeHeadingOrder", () => {
  it("leaves an outline without skips alone", () => {
    expect(render(2, 3, 4, 2, 3)).toEqual(["h2", "h3", "h4", "h2", "h3"]);
  });

  it("starts a document that opens on h3 at h2", () => {
    expect(render(3, 3, 2)).toEqual(["h2", "h2", "h2"]);
  });

  it("keeps nesting when it closes a gap", () => {
    expect(render(3, 4, 3, 2)).toEqual(["h2", "h3", "h2", "h2"]);
  });

  it("closes a gap in the middle of a document", () => {
    expect(render(2, 3, 5, 5, 3)).toEqual(["h2", "h3", "h4", "h4", "h3"]);
  });

  it("keeps an h1 in the content and starts again under it", () => {
    expect(render(1, 3, 1, 2)).toEqual(["h1", "h2", "h1", "h2"]);
  });
});

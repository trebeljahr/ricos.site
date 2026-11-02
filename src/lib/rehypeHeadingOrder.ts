import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/**
 * Close skipped heading levels, so a post that opens on `###` under the page's
 * h1 still reads as an outline to a screen reader. Nesting and anchors stay as
 * written, and a document without skips comes out unchanged.
 */
export const rehypeHeadingOrder = () => {
  return (tree: Root) => {
    const open = [{ written: 1, rendered: 1 }];

    visit(tree, "element", (node: Element) => {
      if (!/^h[1-6]$/.test(node.tagName)) return;

      const written = Number(node.tagName.slice(1));
      while (open.length > 1 && open[open.length - 1].written >= written) open.pop();
      if (written === 1) return;

      const rendered = open[open.length - 1].rendered + 1;
      node.tagName = `h${rendered}`;
      open.push({ written, rendered });
    });
  };
};

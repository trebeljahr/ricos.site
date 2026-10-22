import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

/** Reserve H1 for the booknote page title without changing body text or anchors. */
export const rehypeBooknoteHeadings = () => {
  return (tree: Root) => {
    const headings: Element[] = [];
    visit(tree, "element", (node) => {
      if (/^h[1-6]$/.test(node.tagName)) headings.push(node);
    });

    if (!headings.some((node) => node.tagName === "h1")) return;

    for (const heading of headings) {
      const level = Number(heading.tagName.slice(1));
      heading.tagName = `h${Math.min(6, level + 1)}`;
    }
  };
};

import type { Element, Root, RootContent } from "hast";
import { visit } from "unist-util-visit";

// Same headings remark-toc itself matches, so the list this plugin claims is
// always the one remark-toc just generated.
const tocHeading = /^(table[ -]of[ -])?contents?$|^toc$/i;

const textOf = (node: RootContent | Element): string => {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
};

/**
 * Renames the list remark-toc generates to `<toc-list>` so it can be rendered
 * by TableOfContents instead of a bare `<ul>`. The markup stays a list; only
 * the wrapper changes, and a page without a table of contents is untouched.
 */
export const rehypeTocSpy = () => {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
      if (!parent || typeof index !== "number") return;
      if (!/^h[1-6]$/.test(node.tagName)) return;
      if (!tocHeading.test(textOf(node).trim())) return;

      const next = parent.children
        .slice(index + 1)
        .find((child): child is Element => child.type === "element");

      if (next && (next.tagName === "ul" || next.tagName === "ol")) {
        next.tagName = "toc-list";
      }
    });
  };
};

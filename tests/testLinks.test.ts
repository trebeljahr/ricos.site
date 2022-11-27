import { describe, expect, it } from "vitest";
import { allDocuments, DocumentTypes } from "contentlayer/generated";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import remarkMath, { Root } from "remark-math";
import { kebab } from "case";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import { existsSync } from "fs";

async function generateLinksAndAnchors(document: DocumentTypes) {
  const links = new Set<string>();
  const anchors = new Set<string>();
  const extractedText = document.body.raw;

  await unified()
    .use(remarkParse)
    .use(remarkFrontmatter)
    .use(remarkMdxFrontmatter)
    .use(remarkGfm)
    .use(remarkToc)
    .use(remarkMath)
    .use(() => {
      return (tree: Root) => {
        visit(tree, "link", (linkNode) => {
          links.add(linkNode.url);
        });
        visit(tree, "heading", (headingNode) => {
          if (headingNode.children[0].type === "text") {
            anchors.add(kebab(headingNode.children[0].value));
          }
        });
      };
    })

    .use(remarkStringify)
    .process(extractedText);

  return { links, anchors };
}

describe("test links", async () => {
  const availableLinks = allDocuments
    .map((doc) => doc.slug)
    .concat(["/newsletters", "/booknotes", "/posts", "/needlestack"]);

  const transformedDocs = await Promise.all(
    allDocuments.map(async (document) => {
      const { links, anchors } = await generateLinksAndAnchors(document);
      return {
        title: document.title,
        links,
        anchors,
        availableAnchorLinks: [...anchors].map(
          (anchor) => document.slug + "#" + anchor
        ),
      };
    })
  );

  const allLinks = availableLinks.concat(
    transformedDocs
      .map(({ availableAnchorLinks }) => availableAnchorLinks)
      .flat()
  );

  console.log(allLinks);

  console.log(allLinks.filter((link) => link.includes("fundamental")));

  console.log(
    "exact",
    allLinks.filter((link) =>
      link.includes("/posts/fundamental-problems#fear-of-failure")
    )
  );

  console.log(
    "same check",
    allLinks.includes("/posts/fundamental-problems#fear-of-failure")
  );
  for (const { links, anchors, title } of transformedDocs) {
    if (links.size === 0) continue;

    describe(title, () => {
      for (let link of links) {
        if (link.startsWith("/assets")) {
          it(`should have resource "${link}"`, () => {
            const fileExists = existsSync(`./public${link}`);
            expect(fileExists).toBe(true);
          });
        } else if (link.startsWith("/")) {
          it(`own website should have "${link}"`, () => {
            const linkAvailable = allLinks.includes(link);
            expect(linkAvailable).toBeTruthy();
          });
        } else {
          it(`external link "${link}" should not 404 `, async () => {
            // console.log(link);
            // const response = await fetch(link);
            // expect(response.ok).toBe(true);
          });
        }
      }
    });
  }
});

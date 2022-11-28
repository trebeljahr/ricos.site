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
import fetch from "node-fetch";

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
            anchors.add("#" + kebab(headingNode.children[0].value));
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
        localLinks: [...links].filter((link) => {
          return link.startsWith("/") || link.startsWith("#");
        }),
        foreignLinks: [...links].filter((link) => {
          return !link.startsWith("/");
        }),
        anchors,
        availableAnchorLinks: [...anchors].map(
          (anchor) => document.slug + anchor
        ),
      };
    })
  );

  const allLinks = new Set(
    availableLinks.concat(
      transformedDocs
        .map(({ availableAnchorLinks }) => availableAnchorLinks)
        .flat()
    )
  );

  for (const { localLinks, anchors, title } of transformedDocs) {
    if (localLinks.length !== 0) {
      describe(title, () => {
        for (let fullLink of localLinks) {
          let [link] = fullLink.split(":~:text=");
          if (link.startsWith("#")) {
            it(`should have anchor on site "${link}"`, () => {
              const anchorAvailable = anchors.has(link);
              expect(anchorAvailable).toBe(true);
            });
          } else if (link.startsWith("/assets")) {
            it(`should have resource "${link}"`, () => {
              const fileExists = existsSync(`./public${link}`);
              expect(fileExists).toBe(true);
            });
          } else {
            it(`own website should have "${link}"`, () => {
              const linkAvailable = allLinks.has(link);
              expect(linkAvailable).toBeTruthy();
            });
          }
        }
      });
    }
  }
});

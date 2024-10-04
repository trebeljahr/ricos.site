import {
  DocumentTypes,
  allDocuments,
  allNewsletters,
} from "@contentlayer/generated";
import { kebab } from "case";
import { existsSync } from "fs";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath, { Root } from "remark-math";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import remarkToc from "remark-toc";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { describe, expect, it } from "vitest";
import pLimit from "p-limit";

const limit = pLimit(50);

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

  return { links: [...links], anchors: [...anchors] };
}

describe("test links", async () => {
  const availableLinks = allDocuments
    .map((doc) => doc.slug)
    .concat([
      "/newsletters",
      "/categories",
      "/podcastnotes",
      "/booknotes",
      "/posts",
      "/needlestack",
      "/diatoms",
    ])
    .concat(allNewsletters.map((doc) => "/newsletters/" + doc.number))
    .concat(allNewsletters.map((doc) => "/newsletter/" + doc.number));

  const transformedDocs = await Promise.all(
    allDocuments.map(async (document) => {
      const { links, anchors } = await generateLinksAndAnchors(document);
      const localLinks = links.filter((link) => {
        return link.startsWith("/") || link.startsWith("#");
      });
      return {
        title: document.title,
        localLinks,
        foreignLinks: links.filter((link) => !localLinks.includes(link)),
        anchors,
        availableAnchorLinks: anchors.map((anchor) => document.slug + anchor),
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

  for (const { localLinks, anchors, title, foreignLinks } of transformedDocs) {
    if (localLinks.length !== 0) {
      describe(title || "", () => {
        for (let fullLink of localLinks) {
          let [link] = fullLink.split(":~:text=");
          if (link.startsWith("#")) {
            it(`should have anchor on site "${link}"`, () => {
              const anchorAvailable = anchors.includes(link);
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

    for (let link of foreignLinks) {
      it(`external link "${link}" should not return 404`, async () => {
        await limit(async () => {
          try {
            const response = await fetch(link, { method: "HEAD" });

            if (response.status === 405 || response.status === 403) {
              const getResponse = await fetch(link);

              expect(getResponse.status).not.toBe(404);
            } else {
              expect(response.status).not.toBe(404);
            }
          } catch (error: any) {
            throw new Error(`Failed to fetch ${link}: ${error.message}`);
          }
        });
      }, 10000);
    }
  }
});

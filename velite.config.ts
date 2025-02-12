import remarkCallout from "@r4ai/remark-callout";
import slugify from "@sindresorhus/slugify";
import { Element, Root } from "hast";
import { interactive } from "hast-util-interactive";
import { whitespace } from "hast-util-whitespace";
import { Nodes } from "mdast";
import { Handler } from "mdast-util-to-hast";
import { serialize } from "next-mdx-remote/serialize";
import path from "path";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import { transformerNotationDiff } from "@shikijs/transformers";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkToc from "remark-toc";
import { MDXResult } from "src/@types";
import { getImgWidthAndHeightDuringBuild } from "src/lib/getImgWidthAndHeightDuringBuild";
import { Node, Pluggable } from "unified/lib";
import { SKIP, visit } from "unist-util-visit";
import { defineConfig, s, ZodMeta } from "velite";

declare module "mdast" {
  interface RootContentMap {
    SimpleGallery: Node;
  }
}

const unknown = 1;
const containsImage = 2;
const containsOther = 3;

const rehypeUnwrapGalleries = () => {
  return function (tree: Root) {
    visit(tree, "element", function (node, index, parent) {
      if (
        node.tagName === "p" &&
        parent &&
        typeof index === "number" &&
        applicable(node, false) === containsImage
      ) {
        parent.children.splice(index, 1, ...node.children);
        return [SKIP, index];
      }
    });
  };
};

function applicable(node: Element, inLink: boolean): 1 | 2 | 3 {
  let image: 1 | 2 | 3 = unknown;
  let index = -1;

  while (++index < node.children.length) {
    const child = node.children[index];

    if (child.type === "text" && whitespace(child.value)) {
      // Whitespace is fine.
    } else if (child.type === "element" && child.tagName === "SimpleGallery") {
      image = containsImage;
    } else if (!inLink && interactive(child)) {
      // Cast as `interactive` is always `Element`.
      const linkResult = applicable(child as Element, true);

      if (linkResult === containsOther) {
        return containsOther;
      }

      if (linkResult === containsImage) {
        image = containsImage;
      }
    } else {
      return containsOther;
    }
  }

  return image;
}

function generateExcerpt(text: string, length: number): string {
  const lines = text
    .split("\n")
    .filter((line) => !/^#/.test(line.trim()) || line === "");
  const parts = lines.join(" ").split(/([.,!?])\s*/);
  let excerpt = "";

  for (let i = 0; i < parts.length - 1; i += 2) {
    const sentence = parts[i] + parts[i + 1];
    if (excerpt.length + sentence.length <= length) {
      excerpt += sentence + " ";
    } else {
      break;
    }
  }

  return excerpt.trim().slice(0, -1) + ".";
}

const parseGermanDate = (dateString: string) => {
  const [day, month, year] = dateString.split(".").map(Number);
  return new Date(year, month - 1, day).toISOString();
};

const commonFields = {
  title: s.string(),
  date: s
    .string()
    .refine((date) => /^\d{2}\.\d{2}\.\d{4}$/.test(date), "Invalid date format")
    .transform((date) => parseGermanDate(date)),
  cover: s.object({
    src: s.string(),
    alt: s.string(),
  }),
  metadata: s.metadata(),
  published: s.boolean(),

  tags: s
    .array(s.string())
    .transform((arr) => arr.map((tag) => tag.toLowerCase()).join(",")),
};

type NodeInfo = {
  node: Node;
  index: number;
  parent: { children: Node[] };
};

const remarkGroupImages: Pluggable = () => {
  return async (tree: Node) => {
    const allImages: NodeInfo[] = [];

    visit(tree, (node, index, parent: { children: Node[] }) => {
      if (node.type === "image") {
        allImages.push({ node, index: index || 0, parent });
      }

      return undefined;
    });

    const imageGroups: NodeInfo[][] = [];

    const groupImages = () => {
      allImages.forEach((imageNodeInfo, index) => {
        if (index === 0) imageGroups[index] = [imageNodeInfo];
        else {
          const current = imageNodeInfo.node.position?.start.line || 0;
          const previous = allImages[index - 1].node.position?.start.line || 0;
          if (current - previous === 1) {
            imageGroups[imageGroups.length - 1].push(imageNodeInfo);
          } else {
            imageGroups.push([imageNodeInfo]);
          }
        }
      });
    };

    groupImages();

    await Promise.all(
      imageGroups.map(async (groupedImages) => {
        const newNode = {
          type: "SimpleGallery",
          tagName: "SimpleGallery",
          properties: {
            images: JSON.stringify(
              await Promise.all(
                groupedImages.map(async ({ node }) => {
                  const src = (node as any).url as string;
                  try {
                    const { width, height } =
                      await getImgWidthAndHeightDuringBuild(src);

                    return { width, height, src };
                  } catch (err) {
                    console.error(
                      "Error getting image dimensions for src:",
                      src,
                      err
                    );

                    return {
                      alt: "",
                      title: "",
                      key: src,
                      name: src,
                      src: src,
                      srcSet: [],
                      width: 1,
                      height: 1,
                    };
                  }
                })
              )
            ),
          },
          children: [],
        };

        const firstImage = groupedImages[0];
        const lastImage = groupedImages[groupedImages.length - 1];
        const firstIndex = firstImage.index;
        const lastIndex = lastImage.index;
        const numberToDelete = lastIndex - firstIndex + 1;

        firstImage.parent.children.splice(firstIndex, numberToDelete, newNode);
      })
    );
  };
};

const handleSimpleGalleryNode: Handler = (state, node) => {
  return {
    type: "element",
    tagName: "SimpleGallery",
    properties: node.properties,
    children: state.all(node),
    data: node.data,
  };
};

const addBundledMDXContent = async <T extends Record<string, any>>(
  data: T,
  { meta }: { meta: ZodMeta }
): Promise<
  T & {
    content: MDXResult;
    rawContent: string;
    excerpt: string;
    markdownExcerpt: MDXResult;
  }
> => {
  const remarkPlugins: Pluggable[] = [
    [
      remarkCallout,
      {
        root: (callout: any) => {
          return {
            tagName: "callout-root",
            properties: {
              type: callout.type,
              isFoldable: callout.isFoldable.toString(),
              defaultFolded: callout.defaultFolded?.toString(),
            },
          };
        },
        title: (callout: any) => ({
          tagName: "callout-title",
          properties: {
            type: callout.type,
            isFoldable: callout.isFoldable.toString(),
          },
        }),
        body: (callout: any) => ({
          tagName: "callout-body",
          properties: {},
        }),
      },
    ],
    remarkGroupImages,
    remarkGfm,
    remarkToc,
    remarkMath,
  ];

  const rehypePlugins: Pluggable[] = [
    rehypeUnwrapGalleries,
    // rehypeHighlight,
    rehypeKatex,
    rehypeSlug,
    rehypeAccessibleEmojis,
    [
      rehypePrettyCode,
      {
        transformers: [transformerNotationDiff()],
        theme: {
          dark: "github-dark-dimmed",
          light: "github-light",
        },
        lineNumbers: true,
      },
    ],
  ];

  const recmaPlugins: Pluggable[] = [];

  const rawContent = meta.content || "";
  const mdxOptions = {
    mdxOptions: {
      remarkPlugins,
      rehypePlugins,
      recmaPlugins,
      remarkRehypeOptions: {
        handlers: { SimpleGallery: handleSimpleGalleryNode },
      },
    },
    parseFrontmatter: true,
  };
  const mdxSource = await serialize(rawContent, mdxOptions);

  const excerptString = data.excerpt || generateExcerpt(rawContent, 280);

  const markdownExcerpt = await serialize(excerptString, mdxOptions);

  return {
    ...data,
    content: mdxSource,
    rawContent,
    excerpt: excerptString,
    markdownExcerpt,
  };
};

const addLinksAndSlugTransformer = (link: string = "/") => {
  const transformer = async <T extends Record<string, any>>(
    data: T,
    { meta }: { meta: ZodMeta }
  ): Promise<T & { slug: string; link: string }> => {
    if (!meta.stem) {
      console.error("No stem found for " + meta.path);
      throw Error("No stem found for " + meta.path);
    }

    const slug = slugify(meta.stem);

    return {
      ...data,
      slug,
      link: path.join("/", link, slug),
    };
  };

  return transformer;
};

export default defineConfig({
  root: "src/content/Notes/",
  collections: {
    sectionDescriptions: {
      name: "SectionDescription",
      pattern: "website-section-descriptions/*.md",
      schema: s
        .object({
          title: s.string(),
        })
        .transform(addBundledMDXContent),
    },
    posts: {
      name: "Post",
      pattern: "posts/*.md",
      schema: s
        .object({
          ...commonFields,
          subtitle: s.string(),
        })
        .transform((data) => ({ ...data, contentType: "Post" }))
        .transform(addLinksAndSlugTransformer("posts"))
        .transform(addBundledMDXContent),
    },
    newsletters: {
      name: "Newsletter",
      pattern: "newsletters/*.md",
      schema: s
        .object({
          ...commonFields,
          excerpt: s.string(),
        })
        .transform((data, { meta }) => ({
          ...data,
          slugTitle: slugify(data.title),
          contentType: "Newsletter",
          slug: slugify(meta.stem || ""),
          link: `/newsletters/${slugify(data.title)}`,
          number: meta.stem || "",
        }))
        .transform(addBundledMDXContent),
    },
    booknotes: {
      name: "Booknote",
      pattern: "booknotes/*.md",
      schema: s
        .object({
          ...commonFields,
          subtitle: s.string().optional(),
          bookAuthor: s.string(),
          rating: s.number(),
          summary: s.boolean(),
          detailedNotes: s.boolean(),
          amazonAffiliateLink: s.string(),
        })
        .transform((data) => ({ ...data, contentType: "Booknote" }))
        .transform(addLinksAndSlugTransformer("booknotes"))
        .transform(addBundledMDXContent),
    },
    pages: {
      name: "Page",
      pattern: "pages/*.md",
      schema: s
        .object({
          ...commonFields,
          subtitle: s.string(),
        })
        .transform((data) => ({ ...data, contentType: "Page" }))
        .transform(addLinksAndSlugTransformer())
        .transform(addBundledMDXContent),
    },
    podcastnotes: {
      name: "Podcastnote",
      pattern: "podcastnotes/*.md",
      schema: s
        .object({
          ...commonFields,
          show: s.string(),
          episode: s.number(),
          rating: s.number(),
          links: s.object({
            web: s.string(),
            spotify: s.string(),
            youtube: s.string(),
          }),
        })
        .transform((data) => {
          return {
            ...data,
            contentType: "Podcastnote",
            displayTitle: `${data.title} | ${data.show} – Episode ${data.episode}`,
          };
        })
        .transform(addLinksAndSlugTransformer("podcastnotes"))
        .transform(addBundledMDXContent),
    },
    travelblogs: {
      name: "Travelblog",
      pattern: "travel/**/*.md",
      schema: s
        .object({ ...commonFields })
        .transform((data, { meta }) => {
          const name = meta.path.replace(".md", "").split("/").at(-2);

          if (!name || !meta.stem)
            throw Error("No name found for " + meta.path);

          const parentFolder = slugify(name);
          const slug = slugify(meta.stem);

          return {
            ...data,
            slug,
            path: meta.path,
            contentType: "Travelblog",
            link: path.join("/", "travel", parentFolder, slug),
            parentFolder,
          };
        })
        .transform(addBundledMDXContent),
    },
  },
});

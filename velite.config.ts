import path from "node:path";
import remarkCallout from "@r4ai/remark-callout";
import { transformerNotationDiff, transformerNotationHighlight } from "@shikijs/transformers";
import slugify from "@sindresorhus/slugify";
import type { Element, Root } from "hast";
import { interactive } from "hast-util-interactive";
import { whitespace } from "hast-util-whitespace";
import type { Handler } from "mdast-util-to-hast";
import { bundleMDX } from "mdx-bundler";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";
import rehypeCodeTitles from "rehype-code-titles";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkToc from "remark-toc";
import type { MDXResult } from "src/@types";
import {
  getImgMetaDuringBuild,
  getImgWidthAndHeightDuringBuild,
} from "src/lib/getImgWidthAndHeightDuringBuild";
import type { Node, Pluggable } from "unified/lib";
import { SKIP, visit } from "unist-util-visit";
import { defineConfig, s, type ZodMeta } from "velite";
import seoMetadata from "./src/content/seo-metadata.json";

declare module "mdast" {
  interface RootContentMap {
    SimpleGallery: Node;
  }
}

const unknown = 1;
const containsImage = 2;
const containsOther = 3;

const rehypeUnwrapGalleries = () => {
  return (tree: Root) => {
    visit(tree, "element", (node, index, parent) => {
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

// Bake width/height metadata into the alt of single ![](markdown) images
// that survive remarkGroupImages (i.e. weren't merged into a SimpleGallery).
// Without dimensions ImageRenderer falls back to width=1/height=1, the
// browser reserves a 1x1 box, then the loaded image expands and forces a
// big CLS jump. Reads from the local metadata.json keyed by asset path.
const remarkBakeDimensionsIntoSingleImages: Pluggable = () => {
  return (tree: Node) => {
    visit(tree, "image", (node) => {
      // biome-ignore lint/suspicious/noExplicitAny: mdast image node
      const img = node as any;
      const url: string = img.url || "";
      if (!url || /^https?:\/\//i.test(url)) return;
      const alt: string = img.alt || "";
      if (/\/width:\s*\d+\s*\//.test(alt) && /\/height:\s*\d+\s*\//.test(alt)) return;

      try {
        // biome-ignore lint/suspicious/noExplicitAny: dynamic require for build-time
        const { getLocalMetadata } = require("./src/lib/imageMetadata") as any;
        const all = getLocalMetadata();
        const key = url.replace(/^\//, "");
        const entry = all[key];
        if (!entry?.width || !entry?.height) return;

        const dims = ` /width: ${entry.width} /height: ${entry.height} /`;
        img.alt = alt ? `${alt}${dims}` : dims.trim();
      } catch {
        /* metadata lookup is best-effort */
      }
    });
  };
};

// Pull width/height for a raw <img src> when it points at a known asset.
// Supports both relative `/assets/...` paths and the resized CloudFront
// pattern `https://*/assets/<key>/<width>.webp`.
function lookupImageMeta(
  src: string,
): { width: number; height: number; aspectRatio: number } | undefined {
  // biome-ignore lint/suspicious/noExplicitAny: imageMetadata typed locally
  const meta = require("./src/lib/imageMetadata") as any;
  const all: Record<string, { width: number; height: number } | undefined> =
    meta.getLocalMetadata();

  let key = src;
  // strip protocol+host
  key = key.replace(/^https?:\/\/[^/]+/, "");
  // strip leading slash
  key = key.replace(/^\//, "");
  // resized variant: assets/<path>/<width>.webp -> match any extension under assets/<path>
  const resizedMatch = key.match(/^(assets\/.+)\/(\d+)\.(?:webp|avif|jpe?g|png)$/i);
  if (resizedMatch) {
    const baseKey = resizedMatch[1];
    // try common original extensions
    for (const ext of ["jpeg", "jpg", "png", "webp", "gif"]) {
      const candidate = `${baseKey}.${ext}`;
      if (all[candidate]) {
        const m = all[candidate]!;
        return { width: m.width, height: m.height, aspectRatio: m.width / m.height };
      }
    }
  }
  if (all[key]) {
    const m = all[key]!;
    return { width: m.width, height: m.height, aspectRatio: m.width / m.height };
  }
  return undefined;
}

// Raw <img> JSX in MDX bypasses the next/image renderer:
//   - React 19 SSR auto-emits a <link rel="preload" as="image"> for every
//     eager <img>, so on image-heavy posts those preloads crowd out the LCP
//     image. We force loading="lazy" unless the author opted in (priority,
//     fetchPriority="high", or already-set loading).
//   - Without explicit width/height, the browser cannot reserve layout space
//     for the image, which produces CLS. We fill them in from the local
//     metadata cache when the URL matches a known asset.
const remarkLazyLoadInlineImages: Pluggable = () => {
  return (tree: Node) => {
    visit(tree, (node) => {
      // biome-ignore lint/suspicious/noExplicitAny: mdx-jsx node types live outside the unified mdast typings
      const n = node as any;
      if ((n.type !== "mdxJsxFlowElement" && n.type !== "mdxJsxTextElement") || n.name !== "img") {
        return;
      }
      // biome-ignore lint/suspicious/noExplicitAny: ditto
      const attrs: any[] = n.attributes || [];
      const findAttr = (name: string) =>
        attrs.find((a) => a.type === "mdxJsxAttribute" && a.name === name);
      const has = (name: string) => Boolean(findAttr(name));
      const hasFetchPriorityHigh = attrs.some(
        (a) =>
          a.type === "mdxJsxAttribute" &&
          (a.name === "fetchpriority" || a.name === "fetchPriority") &&
          a.value === "high",
      );

      if (!has("loading") && !has("priority") && !hasFetchPriorityHigh) {
        attrs.push({ type: "mdxJsxAttribute", name: "loading", value: "lazy" });
      }

      if (!has("width") || !has("height")) {
        const srcAttr = findAttr("src");
        const src = typeof srcAttr?.value === "string" ? srcAttr.value : undefined;
        if (src) {
          const meta = lookupImageMeta(src);
          if (meta) {
            // Use a sensible rendered width (from `/640.webp`-style URLs) and
            // derive height from the source aspect ratio so layout space is
            // reserved correctly without forcing a specific display size.
            const widthMatch = src.match(/\/(\d+)\.(?:webp|avif|jpe?g|png)$/i);
            const renderedWidth = widthMatch ? Number(widthMatch[1]) : meta.width;
            const renderedHeight = Math.round(renderedWidth / meta.aspectRatio);
            if (!has("width")) {
              attrs.push({
                type: "mdxJsxAttribute",
                name: "width",
                value: String(renderedWidth),
              });
            }
            if (!has("height")) {
              attrs.push({
                type: "mdxJsxAttribute",
                name: "height",
                value: String(renderedHeight),
              });
            }
          }
        }
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

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images ![alt](url)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links [text](url) → text
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold **text** → text
    .replace(/\*([^*]+)\*/g, "$1") // italic *text* → text
    .replace(/\$[^$]+\$/g, "") // LaTeX $...$
    .replace(/^>\s*/gm, "") // blockquotes > text → text
    .replace(/^[-*]\s+/gm, "") // bullet points - text → text
    .replace(/^\d+\.\s+/gm, ""); // numbered lists 1. text → text
}

function generateExcerpt(text: string, length: number): string {
  const lines = text.split("\n").filter((line) => {
    const trimmed = line.trim();
    if (/^#/.test(trimmed)) return false; // headings
    if (/^!\[/.test(trimmed)) return false; // image-only lines
    if (!trimmed) return false; // empty lines
    return true;
  });
  const joined = stripMarkdown(lines.join(" ")).replace(/\s+/g, " ").trim();

  if (!joined) return "";

  const parts = joined.split(/([.,!?])\s*/);
  let excerpt = "";

  for (let i = 0; i < parts.length - 1; i += 2) {
    const sentence = parts[i] + parts[i + 1];
    if (excerpt.length + sentence.length <= length) {
      excerpt += sentence + " ";
    } else {
      break;
    }
  }

  excerpt = excerpt.trim();

  // If sentence-based splitting produced nothing useful, truncate at word boundary
  if (!excerpt || excerpt === ".") {
    const truncated = joined.slice(0, length);
    const lastSpace = truncated.lastIndexOf(" ");
    return lastSpace > 0 ? truncated.slice(0, lastSpace) + "..." : truncated + "...";
  }

  return excerpt.slice(0, -1) + ".";
}

function generateMetaDescription(text: string): string {
  return generateExcerpt(text, 155);
}

type SeoEntry = {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  keywords?: string[];
};

const seoData: Record<string, SeoEntry> = seoMetadata as Record<string, SeoEntry>;

const defaultCoverPaths = new Set<string>();
let defaultCoverFlushTimer: ReturnType<typeof setTimeout> | undefined;

function flushDefaultCoverWarnings() {
  if (defaultCoverFlushTimer) {
    clearTimeout(defaultCoverFlushTimer);
    defaultCoverFlushTimer = undefined;
  }

  if (defaultCoverPaths.size === 0) return;

  console.warn(
    `[velite] ${defaultCoverPaths.size} entries use the default Midjourney cover. ` +
      "Set VELITE_DEFAULT_COVER_WARNINGS=verbose to list paths.",
  );
  defaultCoverPaths.clear();
}

process.once("beforeExit", flushDefaultCoverWarnings);

function recordDefaultCover(where: string) {
  if (process.env.VELITE_DEFAULT_COVER_WARNINGS === "verbose") {
    console.warn(`[velite] no cover image set — using default Midjourney cover for: ${where}`);
    return;
  }

  defaultCoverPaths.add(where);
  if (defaultCoverFlushTimer) clearTimeout(defaultCoverFlushTimer);
  defaultCoverFlushTimer = setTimeout(flushDefaultCoverWarnings, 1000);
}

const parseGermanDate = (dateString: string) => {
  const [day, month, year] = dateString.split(".").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

// A published entry that sets a cover image but leaves `alt` empty renders as
// `<img alt="">` in the cards and heroes — invisible to screen readers, and
// flagged by SEO crawlers as missing alt text. Throw rather than let velite
// downgrade it to a log line nobody reads: a silent empty alt is exactly how
// these slipped onto the site in the first place. Drafts and entries without
// a cover (`src: ""` falls back to the shared default cover) are exempt.
const requireCoverAltWhenPublished = <
  T extends { cover: { src: string; alt: string }; published: boolean },
>(
  data: T,
  { meta }: { meta: ZodMeta },
): T => {
  if (data.published && data.cover.src.trim() && !data.cover.alt.trim()) {
    throw Error(
      `Missing cover.alt in ${meta.path} — published entries must describe their cover image ("${data.cover.src}")`,
    );
  }

  return data;
};

const commonFields = {
  title: s.string(),
  date: s
    .string()
    .refine((date) => /^\d{2}\.\d{2}\.\d{4}$/.test(date), "Invalid date format")
    .transform((date) => parseGermanDate(date)),
  "date-last-updated": s
    .string()
    .refine((date) => /^\d{2}\.\d{2}\.\d{4}$/.test(date), "Invalid date format")
    .transform((date) => parseGermanDate(date)),
  cover: s
    .object({
      src: s.string(),
      alt: s.string(),
    })
    .transform(async (cover, ctx) => {
      const defaultCover = "assets/midjourney/the-door-to-the-ocean.jpg";
      const defaultCoverAlt = "a door standing in the middle of the ocean";
      const usingDefault = cover.src === "";
      if (usingDefault) {
        const where = (ctx as { meta?: { path?: string } }).meta?.path ?? "(unknown source)";
        recordDefaultCover(where);
      }
      // Resolve the default into `src` too, not just into the dimensions.
      // Leaving src empty meant these entries rendered a broken <img> and
      // emitted no og:image at all.
      const src = usingDefault ? defaultCover : cover.src;
      const { width, height } = await getImgWidthAndHeightDuringBuild(src);
      return {
        ...cover,
        src,
        alt: cover.alt || (usingDefault ? defaultCoverAlt : ""),
        width,
        height,
      };
    }),
  metadata: s.metadata(),
  published: s.boolean(),
  excerpt: s.string().optional(),

  tags: s.array(s.string()).transform((arr) => arr.map((tag) => tag.toLowerCase()).join(",")),
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
                  // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
                  const src = (node as any).url as string;
                  // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
                  const explicitAlt = ((node as any).alt as string) || "";
                  try {
                    const { width, height, alt } = await getImgMetaDuringBuild(src);
                    // Explicit markdown alt wins over the sidecar alt.
                    return {
                      width,
                      height,
                      src,
                      alt: explicitAlt.trim() || alt,
                    };
                  } catch (err) {
                    console.error("Error getting image metadata for src:", src, err);

                    return {
                      alt: explicitAlt,
                      title: "",
                      key: src,
                      name: src,
                      src: src,
                      srcSet: [],
                      width: 1,
                      height: 1,
                    };
                  }
                }),
              ),
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
      }),
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

// biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
const addBundledMDXContent = async <T extends Record<string, any>>(
  data: T,
  { meta }: { meta: ZodMeta },
): Promise<
  T & {
    content: MDXResult;
    excerpt: string;
    markdownExcerpt: MDXResult;
    metaDescription: string;
    seoTitle: string;
    seoKeywords: string[];
    seoOgImage: string;
    seoOgImageAlt: string;
    hasDemos: boolean;
  }
> => {
  const remarkPlugins: Pluggable[] = [
    [
      remarkCallout,
      {
        // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
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
        // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
        title: (callout: any) => ({
          tagName: "callout-title",
          properties: {
            type: callout.type,
            isFoldable: callout.isFoldable.toString(),
          },
        }),
        // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
        body: (_callout: any) => ({
          tagName: "callout-body",
          properties: {},
        }),
      },
    ],
    remarkGroupImages,
    remarkBakeDimensionsIntoSingleImages,
    remarkLazyLoadInlineImages,
    remarkGfm,
    remarkToc,
    remarkMath,
  ];

  const rehypePlugins: Pluggable[] = [
    rehypeUnwrapGalleries,
    rehypeCodeTitles,
    rehypeKatex,
    rehypeSlug,
    rehypeAccessibleEmojis,
    [
      rehypePrettyCode,
      {
        defaultLang: "shell",
        matchAlgorithm: "v3",
        transformers: [
          transformerNotationDiff({ matchAlgorithm: "v3" }),
          transformerNotationHighlight({ matchAlgorithm: "v3" }),
        ],
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
  const { code: mdxCode } = await bundleMDX({
    source: rawContent,
    cwd: path.resolve("src/content/Notes"),
    mdxOptions(options) {
      options.remarkPlugins = [...(options.remarkPlugins ?? []), ...remarkPlugins];
      options.rehypePlugins = [...(options.rehypePlugins ?? []), ...rehypePlugins];
      options.recmaPlugins = [...(options.recmaPlugins ?? []), ...recmaPlugins];
      options.remarkRehypeOptions = {
        handlers: { SimpleGallery: handleSimpleGalleryNode },
      };
      return options;
    },
    esbuildOptions(options) {
      options.platform = "node";
      return options;
    },
  });
  const mdxSource: MDXResult = { code: mdxCode };

  const link = data.link || "";
  const seoEntry = seoData[link] || {};

  let excerptString = data.excerpt || generateExcerpt(rawContent, 280);

  // Fallback chain for empty/broken excerpts
  if (!excerptString || excerptString === ".") {
    excerptString = seoEntry.metaDescription || "";
  }
  if (!excerptString) {
    if (data.bookAuthor) {
      excerptString = `Notes on ${data.title} by ${data.bookAuthor}.`;
    } else {
      excerptString = data.title || "";
    }
  }

  const { code: excerptCode } = await bundleMDX({
    source: excerptString,
    cwd: path.resolve("src/content/Notes"),
    mdxOptions(options) {
      options.remarkPlugins = [...(options.remarkPlugins ?? []), remarkGfm];
      return options;
    },
    esbuildOptions(options) {
      options.platform = "node";
      return options;
    },
  });
  const markdownExcerpt: MDXResult = { code: excerptCode };

  // SEO metadata: JSON override → frontmatter/content fallback → ""
  const metaDescription = seoEntry.metaDescription || generateMetaDescription(excerptString) || "";
  const seoTitle = seoEntry.metaTitle || data.title || "";
  const tagsString: string = data.tags || "";
  const seoKeywords =
    seoEntry.keywords || (tagsString ? tagsString.split(",").map((t: string) => t.trim()) : []);
  const seoOgImage = seoEntry.ogImage || data.cover?.src || "";
  const seoOgImageAlt = seoEntry.ogImageAlt || data.cover?.alt || "";

  // Detect if content uses interactive demo components
  const demoComponentNames = [
    "UnitVectorDemo",
    "ProjectArrowDemo",
    "ProjectionDemo",
    "ExampleWith2Polygons",
    "AxisByAxis",
    "SAT",
    "SATWithResponse",
    "SATWithConcaveShapes",
    "EarClipping",
    "PointAndVectorDemo",
    "MagnitudeDemo",
    "NormalDemo",
    "RotationDemo",
    "DotProductDemo",
    "Triangulation",
    "ThreeFiberDemo",
    "ShaderEditor",
  ];
  const hasDemos = demoComponentNames.some((name) => rawContent.includes(`<${name}`));

  // rehypeKatex emits `className: "katex"` wrappers, so its presence in the
  // compiled MDX is an exact signal for "this page renders math". Only 5 of
  // ~386 pages do, and katex.min.css is 21KB (a fifth of the whole stylesheet)
  // — so it's loaded per-page from /public instead of globally in _app.
  const hasMath = mdxCode.includes("katex");

  return {
    ...data,
    content: mdxSource,
    excerpt: excerptString,
    markdownExcerpt,
    metaDescription,
    seoTitle,
    seoKeywords,
    seoOgImage,
    seoOgImageAlt,
    hasDemos,
    hasMath,
  };
};

const addLinksAndSlugTransformer = (link = "/") => {
  // biome-ignore lint/suspicious/noExplicitAny: explicit any acknowledged
  const transformer = async <T extends Record<string, any>>(
    data: T,
    { meta }: { meta: ZodMeta },
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
        .transform(requireCoverAltWhenPublished)
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
          excludeExcerpt: s.boolean().default(false),
        })
        .transform(requireCoverAltWhenPublished)
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
          goodreadsLink: s.string(),
        })
        .transform(requireCoverAltWhenPublished)
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
        .transform(requireCoverAltWhenPublished)
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
        .transform(requireCoverAltWhenPublished)
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
        .transform(requireCoverAltWhenPublished)
        .transform((data, { meta }) => {
          const name = meta.path.replace(".md", "").split("/").at(-2);

          if (!name || !meta.stem) throw Error("No name found for " + meta.path);

          const parentFolder = slugify(name);
          const slug = slugify(meta.stem);

          // `meta.path` is an absolute filesystem path (`/vercel/path0/...` on
          // Vercel, `/Users/...` locally). It is used to derive `parentFolder`
          // above but deliberately not emitted: getStaticProps would serialise
          // it into __NEXT_DATA__ on every travel page.
          return {
            ...data,
            slug,
            contentType: "Travelblog",
            link: path.join("/", "travel", parentFolder, slug),
            parentFolder,
          };
        })
        .transform(addBundledMDXContent),
    },
  },
});

import slugify from "@sindresorhus/slugify";
import path from "path";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkToc from "remark-toc";
import { defineConfig, s, ZodMeta } from "velite";

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
  excerpt: s.excerpt(),
  published: s.boolean(),
  tags: s.array(s.string()),
  content: s.mdx(),
};

const addLinksAndSlugTransformer = (link: string = "/") => {
  const transformer = <T extends Record<string, any>>(
    data: T,
    { meta }: { meta: ZodMeta }
  ): T & { slug: string; link: string } => {
    if (!meta.stem) {
      console.error("No stem found for " + meta.path);
      throw Error("No stem found for " + meta.path);
    }

    const slug = slugify(meta.stem);

    // console.log(slug);

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
  mdx: {
    remarkPlugins: [
      remarkFrontmatter,
      remarkMdxFrontmatter,
      remarkGfm,
      remarkToc,
      remarkMath,
    ],
    rehypePlugins: [
      rehypeHighlight,
      rehypeKatex,
      rehypeSlug,
      rehypeAccessibleEmojis,
    ],
  },

  collections: {
    posts: {
      name: "Post",
      pattern: "posts/*.md",
      schema: s
        .object({ ...commonFields, subtitle: s.string() })
        .transform(addLinksAndSlugTransformer("posts")),
    },
    newsletters: {
      name: "Newsletter",
      pattern: "newsletter-stuff/newsletters/*.md",
      schema: s
        .object({
          ...commonFields,
        })
        .transform((data, { meta }) => ({
          ...data,
          slugTitle: slugify(data.title),
          slug: slugify(meta.stem || ""),
          link: `/newsletters/${slugify(data.title)}`,
          number: meta.stem || "",
        })),
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
          done: s.boolean(),
          summary: s.boolean(),
          detailedNotes: s.boolean(),
          amazonLink: s.string(),
          amazonAffiliateLink: s.string(),
        })
        .transform(addLinksAndSlugTransformer("booknotes")),
    },
    pages: {
      name: "Page",
      pattern: "pages/*.md",
      schema: s
        .object({ ...commonFields, subtitle: s.string() })
        .transform(addLinksAndSlugTransformer()),
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
            displayTitle: `${data.title} | ${data.show} – Episode ${data.episode}`,
          };
        })
        .transform(addLinksAndSlugTransformer("podcastnotes")),
    },
    travelblogs: {
      name: "Travelblog",
      pattern: "travel/**/*.md",
      schema: s.object({ ...commonFields }).transform((data, { meta }) => {
        const name = meta.path.replace(".md", "").split("/").at(-2);

        if (!name || !meta.stem) throw Error("No name found for " + meta.path);

        const parentFolder = slugify(name);
        const slug = slugify(meta.stem);

        return {
          ...data,
          slug,
          path: meta.path,
          link: path.join("/", "travel", parentFolder, slug),
          parentFolder,
        };
      }),
      // .transform(addLinksAndSlugs("travel")),
    },
  },
});

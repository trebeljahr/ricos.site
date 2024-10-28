import slugify from "@sindresorhus/slugify";
import { MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import path from "path";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkToc from "remark-toc";
import { defineConfig, s, ZodMeta } from "velite";

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

  tags: s.array(s.string()),
};

const addBundledMDXContent = async <T extends Record<string, any>>(
  data: T,
  { meta }: { meta: ZodMeta }
): Promise<
  T & {
    content: MDXRemoteSerializeResult<
      Record<string, unknown>,
      Record<string, unknown>
    >;
    rawContent: string;
    excerpt: string;
  }
> => {
  const remarkPlugins = [remarkGfm, remarkToc, remarkMath];
  const rehypePlugins = [
    rehypeHighlight,
    rehypeKatex,
    rehypeSlug,
    rehypeAccessibleEmojis,
  ];

  const rawContent = meta.content || "";
  const mdxSource = await serialize(rawContent, {
    mdxOptions: { remarkPlugins, rehypePlugins },
    parseFrontmatter: true,
  });

  return {
    ...data,
    content: mdxSource,
    rawContent,
    excerpt: generateExcerpt(rawContent, 280),
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
      pattern: "newsletter-stuff/newsletters/*.md",
      schema: s
        .object({
          ...commonFields,
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

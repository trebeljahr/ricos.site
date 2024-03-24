import {
  defineDocumentType,
  defineNestedType,
  makeSource,
} from "contentlayer/source-files";
import readingTime from "reading-time";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkToc from "remark-toc";
import slugify from "@sindresorhus/slugify";
import remarkWikiLinkPlus from "remark-wiki-link-plus";

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

  return excerpt.trim().slice(0, -1) + "...";
}
const Image = defineNestedType(() => ({
  name: "Image",
  fields: {
    src: { type: "string", required: true },
    alt: { type: "string", required: true },
    width: { type: "number" },
    height: { type: "number" },
  },
}));

const PodcastLinks = defineNestedType(() => ({
  name: "PodcastLinks",
  fields: {
    web: { type: "string", required: true },
    spotify: { type: "string", required: true },
    youtube: { type: "string", required: true },
  },
}));

export const Note = defineDocumentType(() => ({
  name: "Note",
  contentType: "mdx",
  filePathPattern: "**/**/*.md",
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => slugify(doc._raw.sourceFileName.replace(".md", "")),
    },
    readingTime: {
      type: "string",
      resolve: (doc) => readingTime(doc.body.raw).text,
    },
    excerpt: {
      type: "string",
      resolve: (doc) => generateExcerpt(doc.body.raw, 200),
    },
  },
  fields: {
    title: { type: "string", required: true },
    date: { type: "string", required: true },
    tags: { type: "list", of: { type: "string" }, required: true },
    cover: { type: "nested", of: Image, required: true },
    published: { type: "boolean", required: true },
  },
}));

export const Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: "posts/*.md",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    subtitle: { type: "string", required: true },
    excerpt: { type: "string", required: true },
    date: { type: "string", required: true },
    cover: { type: "nested", of: Image, required: true },
    tags: { type: "list", of: { type: "string" }, required: true },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => "/posts/" + doc._raw.sourceFileName.replace(".md", ""),
    },
    readingTime: {
      type: "string",
      resolve: (doc) => readingTime(doc.body.raw).text,
    },
    id: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(".md", ""),
    },
  },
}));

export const Podcastnote = defineDocumentType(() => ({
  name: "Podcastnote",
  filePathPattern: "podcastnotes/*.md",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    show: { type: "string", required: true },
    episode: { type: "number", required: true },
    excerpt: { type: "string", required: true },
    links: { type: "nested", of: PodcastLinks, required: true },
    tags: { type: "list", of: { type: "string" }, required: true },
    rating: { type: "number", required: true },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) =>
        "/podcastnotes/" + doc._raw.sourceFileName.replace(".md", ""),
    },
    readingTime: {
      type: "string",
      resolve: (doc) => readingTime(doc.body.raw).text,
    },
    id: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(".md", ""),
    },
    displayTitle: {
      type: "string",
      resolve: ({ title, show, episode }) =>
        `${title} | ${show} – Episode ${episode}`,
    },
  },
}));

export const Booknote = defineDocumentType(() => ({
  name: "Booknote",
  filePathPattern: "booknotes/*.md",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    subtitle: { type: "string" },
    bookCover: { type: "string", required: true },
    excerpt: { type: "string" },
    bookAuthor: { type: "string", required: true },
    rating: { type: "number", required: true },
    tags: { type: "list", of: { type: "string" }, required: true },
    done: { type: "boolean", required: true },
    summary: { type: "boolean", required: true },
    detailedNotes: { type: "boolean", required: true },

    amazonLink: { type: "string", required: true },
    amazonAffiliateLink: { type: "string", required: true },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) =>
        "/booknotes/" + doc._raw.sourceFileName.replace(".md", ""),
    },
    readingTime: {
      type: "string",
      resolve: (doc) => readingTime(doc.body.raw).text,
    },
    id: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(".md", ""),
    },
  },
}));

export const Newsletter = defineDocumentType(() => ({
  name: "Newsletter",
  filePathPattern: "Newsletter Stuff/newsletters/*.md",
  fields: {
    title: { type: "string", required: true },
    cover: { type: "nested", of: Image, required: true },
    excerpt: { type: "string" },
    tags: { type: "list", of: { type: "string" }, required: true },
  },
  computedFields: {
    number: {
      type: "number",
      resolve: (doc) => parseInt(doc._raw.sourceFileName.replace(".md", "")),
    },
    slug: {
      type: "string",
      resolve: (doc) => "/newsletters/" + slugify(doc.title),
    },
    slugTitle: {
      type: "string",
      resolve: (doc) => slugify(doc.title),
    },
    readingTime: {
      type: "string",
      resolve: (doc) => {
        const time = readingTime(doc.body.raw);
        return time.text;
      },
    },
    id: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(".md", ""),
    },
  },
}));

export const Page = defineDocumentType(() => ({
  name: "Page",
  filePathPattern: "pages/*.md",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    subtitle: { type: "string", required: true },
    cover: { type: "nested", of: Image, required: true },
    description: { type: "string", required: true },
    tags: { type: "list", of: { type: "string" }, required: true },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => "/" + doc._raw.sourceFileName.replace(".md", ""),
    },
    readingTime: {
      type: "string",
      resolve: (doc) => readingTime(doc.body.raw).text,
    },
    id: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(".md", ""),
    },
  },
}));

export default makeSource({
  contentDirPath: "src/content/Notes",
  contentDirExclude: [
    "pages/quotes.json",
    "Newsletter Stuff/newsletter Ad Template.md",
    "Newsletter Stuff/newsletter-template.md",
    ".obsidian/workspace.json",
  ],
  documentTypes: [Post, Page, Newsletter, Booknote, Podcastnote, Note],
  mdx: {
    remarkPlugins: [
      remarkFrontmatter,
      remarkMdxFrontmatter,
      remarkGfm,
      remarkToc,
      [
        remarkWikiLinkPlus,
        { hrefTemplate: (link: string) => `/Attachments/${link}` },
      ],
      remarkMath,
    ],
    rehypePlugins: [
      rehypeHighlight,
      rehypeKatex,
      rehypeSlug,
      rehypeAccessibleEmojis,
    ],
  },
});

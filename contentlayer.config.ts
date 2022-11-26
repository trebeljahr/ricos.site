import {
  defineNestedType,
  defineDocumentType,
  makeSource,
} from "contentlayer/source-files";

const Image = defineNestedType(() => ({
  name: "Image",
  fields: {
    src: { type: "string", required: true },
    alt: { type: "string", required: true },
    width: { type: "number" },
    height: { type: "number" },
  },
}));

const Author = defineNestedType(() => ({
  name: "Author",
  fields: {
    name: { type: "string", required: true },
    picture: { type: "string", required: true }, // { type: "nested", of: Image, required: true },
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

export const Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: "posts/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    subtitle: { type: "string", required: true },
    excerpt: { type: "string", required: true },
    date: { type: "string", required: true },
    author: { type: "nested", of: Author, required: true },
    cover: { type: "nested", of: Image, required: true },
    tags: { type: "list", of: { type: "string" }, required: true },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => "/posts/" + doc._raw.sourceFileName.replace(".mdx", ""),
    },
    id: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(".mdx", ""),
    },
  },
}));

export const Podcastnote = defineDocumentType(() => ({
  name: "Podcastnote",
  filePathPattern: "podcastnotes/*.mdx",
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
        "/podcastnotes/" + doc._raw.sourceFileName.replace(".mdx", ""),
    },
    id: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(".mdx", ""),
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
  filePathPattern: "booknotes/*.mdx",
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
        "/booknotes/" + doc._raw.sourceFileName.replace(".mdx", ""),
    },
    id: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(".mdx", ""),
    },
  },
}));

export const Newsletter = defineDocumentType(() => ({
  name: "Newsletter",
  filePathPattern: "newsletters/*.md",
  fields: {
    title: { type: "string", required: true },
    cover: { type: "nested", of: Image, required: true },
    excerpt: { type: "string" },
    tags: { type: "list", of: { type: "string" }, required: true },
  },
  computedFields: {
    newsletterNumber: {
      type: "number",
      resolve: (doc) => parseInt(doc._raw.sourceFileName.replace(".md", "")),
    },
    slug: {
      type: "string",
      resolve: (doc) =>
        "/newsletters/" + doc._raw.sourceFileName.replace(".md", ""),
    },
    id: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(".md", ""),
    },
  },
}));

export const Page = defineDocumentType(() => ({
  name: "Page",
  filePathPattern: "pages/*.mdx",
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    subtitle: { type: "string", required: true },
    description: { type: "string", required: true },
    tags: { type: "list", of: { type: "string" }, required: true },
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => "/" + doc._raw.sourceFileName.replace(".mdx", ""),
    },
    id: {
      type: "string",
      resolve: (doc) => doc._raw.sourceFileName.replace(".mdx", ""),
    },
  },
}));

import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkToc from "remark-toc";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import rehypeSlug from "rehype-slug";
import { rehypeAccessibleEmojis } from "rehype-accessible-emojis";

export default makeSource({
  contentDirPath: "src/content",
  documentTypes: [Post, Page, Newsletter, Booknote, Podcastnote],
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
});

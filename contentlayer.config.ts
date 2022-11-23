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
  },
}));

const Author = defineNestedType(() => ({
  name: "Author",
  fields: {
    name: { type: "string", required: true },
    picture: { type: "string", required: true }, // { type: "nested", of: Image, required: true },
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
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc: any) => doc._raw.sourceFileName.replace(".mdx", ""),
    },
  },
}));

export const Booknotes = defineDocumentType(() => ({
  name: "Booknotes",
  filePathPattern: "booknotes/*.md",
  fields: {
    title: { type: "string", required: true },
    subtitle: { type: "string" },
    bookCover: { type: "string", required: true },
    slug: { type: "string", required: true },
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
    newsletterNumber: {
      type: "string",
      resolve: (doc: any) => doc._raw.sourceFileName.replace(".mdx", ""),
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
  },
  computedFields: {
    newsletterNumber: {
      type: "string",
      resolve: (doc: any) => doc._raw.sourceFileName.replace(".mdx", ""),
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
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc: any) => doc._raw.sourceFileName.replace(".mdx", ""),
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
  documentTypes: [Post, Page, Newsletter, Booknotes],
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

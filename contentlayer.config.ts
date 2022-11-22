import { defineDocumentType, makeSource } from "contentlayer/source-files";
// import readingTime from "reading-time";

export const Blog = defineDocumentType(() => ({
  name: "Blog",
  filePathPattern: "src/content/*.mdx",
  bodyType: "mdx",
  fields: {
    title: { type: "string", required: true },
    publishedAt: { type: "string", required: true },
    description: { type: "string", required: true },
    cover: { type: "string", required: true },
  },
  computedFields: {
    // readingTime: {
    //   type: "json",
    //   resolve: (doc) => readingTime(doc.body.raw),
    // },
    slug: {
      type: "string",
      resolve: (doc: any) => doc._raw.sourceFileName.replace(".mdx", ""),
    },
  },
}));

export default makeSource({
  contentDirPath: "data",
  documentTypes: [Blog],
  mdx: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

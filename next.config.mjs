import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkToc from "remark-toc";
import nextMDX from "@next/mdx";
import remarkMdxCodeMeta from "remark-mdx-code-meta";
// import rehypeHighlight from "rehype-highlight";

const withMDX = nextMDX({
  options: {
    // jsx: true,
    extension: /\.mdx$/,
    providerImportSource: "@mdx-js/react",
    remarkPlugins: [
      remarkFrontmatter,
      remarkMdxFrontmatter,
      remarkGfm,
      remarkToc,
      // remarkMdxCodeMeta,
    ],
    rehypePlugins: [],
  },
});

export default withMDX({
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
});

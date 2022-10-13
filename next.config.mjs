import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import rehypeHighlight from "rehype-highlight";
import nextMDX from "@next/mdx";

const withMDX = nextMDX({
  options: {
    extension: /\.(md|mdx)$/,
    providerImportSource: "@mdx-js/react",
    remarkPlugins: [remarkGfm, remarkToc],
    rehypePlugins: [rehypeHighlight],
  },
});

export default withMDX({
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
});

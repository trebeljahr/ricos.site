const { withContentlayer } = require("next-contentlayer");

const nextConfig = {
  // pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  images: {
    domains: [process.env.NEXT_PUBLIC_STATIC_FILE_URL],
  },
};

module.exports = withContentlayer(nextConfig);

// const withMDX = nextMDX({
//   options: {
//     extension: /\.mdx$/,
//     providerImportSource: "@mdx-js/react",
//     remarkPlugins: [
//       remarkFrontmatter,
//       remarkMdxFrontmatter,
//       remarkGfm,
//       remarkToc,
//       remarkMath,
//     ],
//     rehypePlugins: [rehypeHighlight, rehypeKatex],
//   },
// });

// const configWithMdx = withMDX();

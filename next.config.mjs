// const withMDX = require("@next/mdx")({
//   options: {
//     remarkPlugins: [, import("rehype-raw")],
//     rehypePlugins: [import("remark-gfm"), import("rehype-highlight")],
//     providerImportSource: "@mdx-js/react",
//   },
// });

// module.exports = withMDX({
//   pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
// });

// import remarkFrontmatter from "remark-frontmatter";
// import remarkGfm from "remark-gfm";
// import remarkToc from "remark-toc";
// import rehypeHighlight from "rehype-highlight";
// import rehypeRaw from "rehype-raw";

// const config = {
//   webpack: (config, options) => {
//     config.module.rules.push({
//       extension: /\.(md|mdx)$/,
//       use: [
//         options.defaultLoaders.babel,
//         {
//           loader: "@mdx-js/loader",
//           options: {
//             providerImportSource: "@mdx-js/react",
//             remarkPlugins: [remarkFrontmatter, remarkGfm, remarkToc],
//             rehypePlugins: [rehypeHighlight, rehypeRaw],
//           },
//         },
//       ],
//     });

//     return config;
//   },
//   reactStrictMode: true,
//   pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
// };

const config = {};
export default config;

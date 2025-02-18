import { generateRedirects } from "./src/scripts/createRedirects.js";

const isDev = process.argv.indexOf("dev") !== -1;
const isBuild = process.argv.indexOf("build") !== -1;
if (!process.env.VELITE_STARTED && (isDev || isBuild)) {
  process.env.VELITE_STARTED = "1";
  const { build } = await import("velite");
  await build({ watch: isDev, clean: !isDev, logLevel: "error" });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./image-loader.js",
  },
  redirects: customRedirects,
  webpack: (config, { isServer }) => {
    config.infrastructureLogging = {
      level: "error",
    };

    config.module.rules.push({
      test: /\.(ogg|mp3|wav|mpe?g)$/i,
      exclude: config.exclude,
      use: [
        {
          loader: "url-loader",
          options: {
            limit: config.inlineImageLimit,
            fallback: "file-loader",
            publicPath: `${config.assetPrefix}/_next/static/images/`,
            outputPath: `${isServer ? "../" : ""}static/images/`,
            name: "[name]-[hash].[ext]",
            esModule: config.esModule || false,
          },
        },
      ],
    });

    // shader support
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /(node_modules|withContext)/,
      use: ["raw-loader", "glslify-loader"],
    });

    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      exclude: /node_modules/,
      use: ["raw-loader"],
    });

    return config;
  },
};

import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);

async function customRedirects() {
  const redirects = await generateRedirects();
  return [
    ...redirects,
    {
      source: "/newsletter/:id*",
      destination: "/newsletters/:id*",
      permanent: true,
    },
    {
      source: "/pages/:id*",
      destination: "/:id*",
      permanent: true,
    },
    {
      source: "/feed.xml",
      destination: "/rss.xml",
      permanent: true,
    },
    {
      source: "/diatoms",
      destination: "/posts/diatoms",
      permanent: true,
    },
    {
      source: "/posts/my-productivity-systems",
      destination: "/posts/my-productivity-system",
      permanent: true,
    },
  ];
}

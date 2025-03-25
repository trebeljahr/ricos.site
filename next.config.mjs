import { generateRedirects } from "./src/scripts/createRedirects.js";
import prevalPlugin from "next-plugin-preval/config.js";
import bundleAnalyzer from "@next/bundle-analyzer";

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
            publicPath: `${config.assetPrefix}/_next/static/audio/`,
            outputPath: `${isServer ? "../" : ""}static/audio/`,
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

    return config;
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withPrevalPlugin = prevalPlugin();

export default withPrevalPlugin(withBundleAnalyzer(nextConfig));

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

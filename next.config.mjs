import { generateRedirects } from "./src/scripts/createRedirects.js";
import { build } from "velite";

const nextConfig = {
  images: {
    loader: "custom",
    loaderFile: "./image-loader.js",
  },
  redirects: customRedirects,
  webpack: (config) => {
    config.infrastructureLogging = {
      level: "error",
    };

    config.plugins.push(new VeliteWebpackPlugin());

    return config;
  },
};

class VeliteWebpackPlugin {
  static started = false;
  apply(/** @type {import('webpack').Compiler} */ compiler) {
    compiler.hooks.beforeCompile.tapPromise("VeliteWebpackPlugin", async () => {
      if (VeliteWebpackPlugin.started) return;
      VeliteWebpackPlugin.started = true;
      const dev = compiler.options.mode === "development";
      await build({ watch: dev, clean: !dev });
    });
  }
}

export default nextConfig;

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
      source: "/feed.xml",
      destination: "/rss.xml",
      permanent: true,
    },
    {
      source: "/diatoms",
      destination: "/posts/diatoms",
      permanent: true,
    },
  ];
}

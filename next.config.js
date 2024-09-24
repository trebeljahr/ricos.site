import { withContentlayer } from "next-contentlayer";
import { generateRedirects } from "./src/scripts/createRedirects.js";

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

    return config;
  },
};

const configWithContentlayer = withContentlayer(nextConfig);

export default configWithContentlayer;

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
      source: "/feed.xml", // The URL you want to redirect
      destination: "/rss.xml", // The target URL
      permanent: true, // Indicates a 301 permanent redirect
    },
    {
      source: "/diatoms",
      destination: "/posts/diatoms",
      permanent: true,
    },
  ];
}

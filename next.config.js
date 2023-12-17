import { withContentlayer } from "next-contentlayer";
import { generateRedirects } from "./src/scripts/createRedirects.js";

const nextConfig = {
  images: {
    domains: [process.env.NEXT_PUBLIC_STATIC_FILE_URL],
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
  ];
}
